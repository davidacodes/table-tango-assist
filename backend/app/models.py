from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class ApiModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class PartyStatus(StrEnum):
    waiting = "waiting"
    notified = "notified"
    seated = "seated"
    left = "left"
    no_show = "no-show"


class AuthStatus(ApiModel):
    authenticated: bool


class LoginRequest(ApiModel):
    passcode: str = Field(min_length=1)


class LoginResponse(AuthStatus):
    access_token: str | None = Field(default=None, alias="accessToken")
    token_type: str = Field(default="bearer", alias="tokenType")


class Settings(ApiModel):
    seating_interval_minutes: int = Field(alias="seatingIntervalMinutes", ge=1)


class SettingsPatch(ApiModel):
    seating_interval_minutes: int | None = Field(default=None, alias="seatingIntervalMinutes", ge=1)


class NewPartyInput(ApiModel):
    name: str = Field(min_length=1)
    phone: str = Field(min_length=1)
    party_size: int = Field(alias="partySize", ge=1)
    arrival_time: datetime = Field(alias="arrivalTime")


class UpdatePartySizeRequest(ApiModel):
    party_size: int = Field(alias="partySize", ge=1)


class SetPartyStatusRequest(ApiModel):
    status: PartyStatus


class SeatPartyRequest(ApiModel):
    table_id: str = Field(alias="tableId", min_length=1)


class TableInput(ApiModel):
    number: str = Field(min_length=1)
    capacity: int = Field(ge=1)


class TablePatch(ApiModel):
    number: str | None = Field(default=None, min_length=1)
    capacity: int | None = Field(default=None, ge=1)


class TableOccupant(ApiModel):
    party_id: str = Field(alias="partyId")
    name: str
    party_size: int = Field(alias="partySize", ge=1)
    seated_at: datetime = Field(alias="seatedAt")


class RestaurantTable(ApiModel):
    id: str
    number: str
    capacity: int = Field(ge=1)
    occupied_by: TableOccupant | None = Field(default=None, alias="occupiedBy")


class Party(ApiModel):
    id: str
    name: str
    phone: str
    party_size: int = Field(alias="partySize", ge=1)
    arrival_time: datetime = Field(alias="arrivalTime")
    estimated_wait_minutes: int = Field(alias="estimatedWaitMinutes", ge=0)
    status: PartyStatus
    notified_at: datetime | None = Field(default=None, alias="notifiedAt")
    seated_at: datetime | None = Field(default=None, alias="seatedAt")
    closed_at: datetime | None = Field(default=None, alias="closedAt")
    table_id: str | None = Field(default=None, alias="tableId")
    created_at: datetime = Field(alias="createdAt")


class SeatPartyResponse(ApiModel):
    party: Party
    table: RestaurantTable


class Error(ApiModel):
    error: str
