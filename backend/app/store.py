from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .database import create_tables, session_factory
from .models import (
    NewPartyInput,
    Party,
    PartyStatus,
    RestaurantTable,
    Settings,
    SettingsPatch,
    TableInput,
    TableOccupant,
    TablePatch,
)
from .orm import PartyRow, RestaurantTableRow, SettingsRow


ACTIVE_STATUSES = {PartyStatus.waiting, PartyStatus.notified}
TRANSITIONS: dict[PartyStatus, set[PartyStatus]] = {
    PartyStatus.waiting: {
        PartyStatus.notified,
        PartyStatus.seated,
        PartyStatus.left,
        PartyStatus.no_show,
    },
    PartyStatus.notified: {PartyStatus.seated, PartyStatus.left, PartyStatus.no_show},
    PartyStatus.seated: set(),
    PartyStatus.left: set(),
    PartyStatus.no_show: set(),
}


def now() -> datetime:
    return datetime.now(UTC)


def uid() -> str:
    return uuid4().hex[:8]


def estimate_wait(parties_ahead: int, seating_interval_minutes: int) -> int:
    return max(0, parties_ahead) * max(0, seating_interval_minutes)


def can_transition(from_status: PartyStatus, to_status: PartyStatus) -> bool:
    return to_status in TRANSITIONS[from_status]


def not_found(message: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"error": message})


def bad_request(message: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"error": message})


def conflict(message: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail={"error": message})


class RestaurantStore:
    def __init__(self, session: Session):
        self.session = session

    def list_parties(self) -> list[Party]:
        rows = self.session.scalars(select(PartyRow).order_by(PartyRow.created_at)).all()
        return [party_from_row(row) for row in rows]

    def add_party(self, input_data: NewPartyInput) -> Party:
        settings = self._settings()
        active_count = self.session.scalar(
            select(func.count())
            .select_from(PartyRow)
            .where(PartyRow.status.in_([status.value for status in ACTIVE_STATUSES]))
        )
        row = PartyRow(
            id=uid(),
            name=input_data.name.strip(),
            phone=input_data.phone.strip(),
            party_size=input_data.party_size,
            arrival_time=input_data.arrival_time,
            estimated_wait_minutes=estimate_wait(
                int(active_count or 0),
                settings.seating_interval_minutes,
            ),
            status=PartyStatus.waiting.value,
            created_at=now(),
        )
        self.session.add(row)
        self.session.commit()
        self.session.refresh(row)
        return party_from_row(row)

    def update_party_size(self, party_id: str, party_size: int) -> Party:
        row = self._party(party_id)
        row.party_size = max(1, int(party_size))
        self.session.commit()
        self.session.refresh(row)
        return party_from_row(row)

    def notify_party(self, party_id: str) -> Party:
        row = self._party(party_id)
        if not can_transition(PartyStatus(row.status), PartyStatus.notified):
            raise conflict("Cannot notify this party")
        row.status = PartyStatus.notified.value
        row.notified_at = now()
        self.session.commit()
        self.session.refresh(row)
        return party_from_row(row)

    def set_party_status(self, party_id: str, target_status: PartyStatus) -> Party:
        if target_status not in {PartyStatus.left, PartyStatus.no_show}:
            raise bad_request("Status must be left or no-show")
        row = self._party(party_id)
        if not can_transition(PartyStatus(row.status), target_status):
            raise conflict("Invalid status change")
        row.status = target_status.value
        row.closed_at = now()
        self.session.commit()
        self.session.refresh(row)
        return party_from_row(row)

    def seat_party(self, party_id: str, table_id: str) -> tuple[Party, RestaurantTable]:
        party = self._party(party_id)
        table = self._table(table_id)
        if not can_transition(PartyStatus(party.status), PartyStatus.seated):
            raise conflict("Invalid status change")
        if table.occupied_party_id:
            raise conflict("Table is already occupied")
        if table.capacity < party.party_size:
            raise conflict("Table is too small for this party")

        seated_at = now()
        party.status = PartyStatus.seated.value
        party.seated_at = seated_at
        party.closed_at = seated_at
        party.table_id = table.id
        table.occupied_party_id = party.id
        table.occupied_name = party.name
        table.occupied_party_size = party.party_size
        table.occupied_seated_at = seated_at
        self.session.commit()
        self.session.refresh(party)
        self.session.refresh(table)
        return party_from_row(party), table_from_row(table)

    def list_tables(self) -> list[RestaurantTable]:
        rows = self.session.scalars(select(RestaurantTableRow).order_by(RestaurantTableRow.number)).all()
        return [table_from_row(row) for row in rows]

    def add_table(self, input_data: TableInput) -> RestaurantTable:
        row = RestaurantTableRow(
            id=uid(),
            number=input_data.number.strip(),
            capacity=max(1, int(input_data.capacity)),
        )
        self.session.add(row)
        self.session.commit()
        self.session.refresh(row)
        return table_from_row(row)

    def update_table(self, table_id: str, patch: TablePatch) -> RestaurantTable:
        row = self._table(table_id)
        if patch.number is not None:
            row.number = patch.number.strip()
        if patch.capacity is not None:
            row.capacity = max(1, int(patch.capacity))
        self.session.commit()
        self.session.refresh(row)
        return table_from_row(row)

    def remove_table(self, table_id: str) -> None:
        row = self._table(table_id)
        self.session.delete(row)
        self.session.commit()

    def release_table(self, table_id: str) -> RestaurantTable:
        row = self._table(table_id)
        row.occupied_party_id = None
        row.occupied_name = None
        row.occupied_party_size = None
        row.occupied_seated_at = None
        self.session.commit()
        self.session.refresh(row)
        return table_from_row(row)

    def get_settings(self) -> Settings:
        return settings_from_row(self._settings())

    def update_settings(self, patch: SettingsPatch) -> Settings:
        row = self._settings()
        if patch.seating_interval_minutes is not None:
            row.seating_interval_minutes = patch.seating_interval_minutes
        self.session.commit()
        self.session.refresh(row)
        return settings_from_row(row)

    def _settings(self) -> SettingsRow:
        row = self.session.get(SettingsRow, 1)
        if row is None:
            row = SettingsRow(id=1, seating_interval_minutes=15)
            self.session.add(row)
            self.session.commit()
            self.session.refresh(row)
        return row

    def _party(self, party_id: str) -> PartyRow:
        row = self.session.get(PartyRow, party_id)
        if row is None:
            raise not_found("Party not found")
        return row

    def _table(self, table_id: str) -> RestaurantTableRow:
        row = self.session.get(RestaurantTableRow, table_id)
        if row is None:
            raise not_found("Table not found")
        return row


def settings_from_row(row: SettingsRow) -> Settings:
    return Settings(seatingIntervalMinutes=row.seating_interval_minutes)


def party_from_row(row: PartyRow) -> Party:
    return Party(
        id=row.id,
        name=row.name,
        phone=row.phone,
        partySize=row.party_size,
        arrivalTime=row.arrival_time,
        estimatedWaitMinutes=row.estimated_wait_minutes,
        status=PartyStatus(row.status),
        notifiedAt=row.notified_at,
        seatedAt=row.seated_at,
        closedAt=row.closed_at,
        tableId=row.table_id,
        createdAt=row.created_at,
    )


def table_from_row(row: RestaurantTableRow) -> RestaurantTable:
    occupant = None
    if row.occupied_party_id and row.occupied_name and row.occupied_party_size and row.occupied_seated_at:
        occupant = TableOccupant(
            partyId=row.occupied_party_id,
            name=row.occupied_name,
            partySize=row.occupied_party_size,
            seatedAt=row.occupied_seated_at,
        )
    return RestaurantTable(
        id=row.id,
        number=row.number,
        capacity=row.capacity,
        occupiedBy=occupant,
    )


def seed_database() -> None:
    with session_factory()() as session:
        has_tables = session.scalar(select(func.count()).select_from(RestaurantTableRow)) or 0
        has_parties = session.scalar(select(func.count()).select_from(PartyRow)) or 0
        if has_tables or has_parties:
            return

        store = RestaurantStore(session)
        session.add(SettingsRow(id=1, seating_interval_minutes=15))
        session.add_all(
            [
                RestaurantTableRow(id=uid(), number="1", capacity=2),
                RestaurantTableRow(id=uid(), number="2", capacity=2),
                RestaurantTableRow(id=uid(), number="3", capacity=4),
                RestaurantTableRow(id=uid(), number="4", capacity=4),
                RestaurantTableRow(id=uid(), number="5", capacity=6),
                RestaurantTableRow(id=uid(), number="6", capacity=8),
            ]
        )
        session.commit()

        seed_time = now() - timedelta(minutes=25)
        first = store.add_party(
            NewPartyInput(
                name="Smith",
                phone="555-0101",
                partySize=2,
                arrivalTime=seed_time,
            )
        )
        store.notify_party(first.id)
        store.add_party(
            NewPartyInput(
                name="Garcia",
                phone="555-0142",
                partySize=4,
                arrivalTime=seed_time + timedelta(minutes=8),
            )
        )
        seated = store.add_party(
            NewPartyInput(
                name="Patel",
                phone="555-0188",
                partySize=3,
                arrivalTime=seed_time - timedelta(minutes=12),
            )
        )
        table = session.scalars(
            select(RestaurantTableRow).where(RestaurantTableRow.capacity == 4).limit(1)
        ).one()
        store.seat_party(seated.id, table.id)


def init_store() -> None:
    create_tables()
    seed_database()
