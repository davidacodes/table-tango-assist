from fastapi import APIRouter, Depends

from ..auth import current_token
from ..models import Settings, SettingsPatch
from ..store import store

router = APIRouter(prefix="/settings", tags=["Settings"], dependencies=[Depends(current_token)])


@router.get("", response_model=Settings, operation_id="getSettings")
def get_settings() -> Settings:
    return store.get_settings()


@router.patch("", response_model=Settings, operation_id="updateSettings")
def update_settings(patch: SettingsPatch) -> Settings:
    return store.update_settings(patch)
