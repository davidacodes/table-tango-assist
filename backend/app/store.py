from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi import HTTPException, status

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


@dataclass
class RestaurantStore:
    parties: list[Party] = field(default_factory=list)
    tables: list[RestaurantTable] = field(default_factory=list)
    settings: Settings = field(default_factory=lambda: Settings(seatingIntervalMinutes=15))

    @classmethod
    def seeded(cls) -> "RestaurantStore":
        store = cls()
        seed_time = now() - timedelta(minutes=25)
        store.tables = [
            RestaurantTable(id=uid(), number="1", capacity=2),
            RestaurantTable(id=uid(), number="2", capacity=2),
            RestaurantTable(id=uid(), number="3", capacity=4),
            RestaurantTable(id=uid(), number="4", capacity=4),
            RestaurantTable(id=uid(), number="5", capacity=6),
            RestaurantTable(id=uid(), number="6", capacity=8),
        ]
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
        store.seat_party(seated.id, store.tables[2].id)
        return store

    def list_parties(self) -> list[Party]:
        return [party.model_copy(deep=True) for party in self.parties]

    def add_party(self, input_data: NewPartyInput) -> Party:
        active_count = sum(1 for party in self.parties if party.status in ACTIVE_STATUSES)
        party = Party(
            id=uid(),
            name=input_data.name.strip(),
            phone=input_data.phone.strip(),
            partySize=input_data.party_size,
            arrivalTime=input_data.arrival_time,
            estimatedWaitMinutes=estimate_wait(
                active_count,
                self.settings.seating_interval_minutes,
            ),
            status=PartyStatus.waiting,
            createdAt=now(),
        )
        self.parties.append(party)
        return party.model_copy(deep=True)

    def update_party_size(self, party_id: str, party_size: int) -> Party:
        party = self._party(party_id)
        party.party_size = max(1, int(party_size))
        return party.model_copy(deep=True)

    def notify_party(self, party_id: str) -> Party:
        party = self._party(party_id)
        if not can_transition(party.status, PartyStatus.notified):
            raise conflict("Cannot notify this party")
        party.status = PartyStatus.notified
        party.notified_at = now()
        return party.model_copy(deep=True)

    def set_party_status(self, party_id: str, target_status: PartyStatus) -> Party:
        if target_status not in {PartyStatus.left, PartyStatus.no_show}:
            raise bad_request("Status must be left or no-show")
        party = self._party(party_id)
        if not can_transition(party.status, target_status):
            raise conflict("Invalid status change")
        party.status = target_status
        party.closed_at = now()
        return party.model_copy(deep=True)

    def seat_party(self, party_id: str, table_id: str) -> tuple[Party, RestaurantTable]:
        party = self._party(party_id)
        table = self._table(table_id)
        if not can_transition(party.status, PartyStatus.seated):
            raise conflict("Invalid status change")
        if table.occupied_by:
            raise conflict("Table is already occupied")
        if table.capacity < party.party_size:
            raise conflict("Table is too small for this party")
        seated_at = now()
        party.status = PartyStatus.seated
        party.seated_at = seated_at
        party.closed_at = seated_at
        party.table_id = table.id
        table.occupied_by = TableOccupant(
            partyId=party.id,
            name=party.name,
            partySize=party.party_size,
            seatedAt=seated_at,
        )
        return party.model_copy(deep=True), table.model_copy(deep=True)

    def list_tables(self) -> list[RestaurantTable]:
        return [table.model_copy(deep=True) for table in self.tables]

    def add_table(self, input_data: TableInput) -> RestaurantTable:
        table = RestaurantTable(
            id=uid(),
            number=input_data.number.strip(),
            capacity=max(1, int(input_data.capacity)),
        )
        self.tables.append(table)
        return table.model_copy(deep=True)

    def update_table(self, table_id: str, patch: TablePatch) -> RestaurantTable:
        table = self._table(table_id)
        if patch.number is not None:
            table.number = patch.number.strip()
        if patch.capacity is not None:
            table.capacity = max(1, int(patch.capacity))
        return table.model_copy(deep=True)

    def remove_table(self, table_id: str) -> None:
        table = self._table(table_id)
        self.tables.remove(table)

    def release_table(self, table_id: str) -> RestaurantTable:
        table = self._table(table_id)
        table.occupied_by = None
        return table.model_copy(deep=True)

    def get_settings(self) -> Settings:
        return self.settings.model_copy(deep=True)

    def update_settings(self, patch: SettingsPatch) -> Settings:
        if patch.seating_interval_minutes is not None:
            self.settings.seating_interval_minutes = patch.seating_interval_minutes
        return self.settings.model_copy(deep=True)

    def _party(self, party_id: str) -> Party:
        for party in self.parties:
            if party.id == party_id:
                return party
        raise not_found("Party not found")

    def _table(self, table_id: str) -> RestaurantTable:
        for table in self.tables:
            if table.id == table_id:
                return table
        raise not_found("Table not found")


store = RestaurantStore.seeded()
