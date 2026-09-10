from fastapi import APIRouter, Depends, status

from ..auth import current_token
from ..models import (
    NewPartyInput,
    Party,
    SeatPartyRequest,
    SeatPartyResponse,
    SetPartyStatusRequest,
    UpdatePartySizeRequest,
)
from ..store import store

router = APIRouter(prefix="/parties", tags=["Parties"], dependencies=[Depends(current_token)])


@router.get("", response_model=list[Party], operation_id="listParties")
def list_parties() -> list[Party]:
    return store.list_parties()


@router.post("", response_model=Party, status_code=status.HTTP_201_CREATED, operation_id="addParty")
def add_party(payload: NewPartyInput) -> Party:
    return store.add_party(payload)


@router.patch("/{party_id}/size", response_model=Party, operation_id="updatePartySize")
def update_party_size(party_id: str, payload: UpdatePartySizeRequest) -> Party:
    return store.update_party_size(party_id, payload.party_size)


@router.post("/{party_id}/notify", response_model=Party, operation_id="notifyParty")
def notify_party(party_id: str) -> Party:
    return store.notify_party(party_id)


@router.patch("/{party_id}/status", response_model=Party, operation_id="setPartyStatus")
def set_party_status(party_id: str, payload: SetPartyStatusRequest) -> Party:
    return store.set_party_status(party_id, payload.status)


@router.post("/{party_id}/seat", response_model=SeatPartyResponse, operation_id="seatParty")
def seat_party(party_id: str, payload: SeatPartyRequest) -> SeatPartyResponse:
    party, table = store.seat_party(party_id, payload.table_id)
    return SeatPartyResponse(party=party, table=table)
