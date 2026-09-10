from fastapi import APIRouter, Depends

from ..auth import current_token
from ..dependencies import get_store
from ..models import Settings, SettingsPatch
from ..store import RestaurantStore

router = APIRouter(prefix="/settings", tags=["Settings"], dependencies=[Depends(current_token)])


@router.get("", response_model=Settings, operation_id="getSettings")
def get_settings(store: RestaurantStore = Depends(get_store)) -> Settings:
    return store.get_settings()


@router.patch("", response_model=Settings, operation_id="updateSettings")
def update_settings(patch: SettingsPatch, store: RestaurantStore = Depends(get_store)) -> Settings:
    return store.update_settings(patch)
