from fastapi import APIRouter, Depends, Response, status

from ..auth import current_token
from ..models import RestaurantTable, TableInput, TablePatch
from ..store import store

router = APIRouter(prefix="/tables", tags=["Tables"], dependencies=[Depends(current_token)])


@router.get("", response_model=list[RestaurantTable], operation_id="listTables")
def list_tables() -> list[RestaurantTable]:
    return store.list_tables()


@router.post("", response_model=RestaurantTable, status_code=status.HTTP_201_CREATED, operation_id="addTable")
def add_table(payload: TableInput) -> RestaurantTable:
    return store.add_table(payload)


@router.patch("/{table_id}", response_model=RestaurantTable, operation_id="updateTable")
def update_table(table_id: str, payload: TablePatch) -> RestaurantTable:
    return store.update_table(table_id, payload)


@router.delete("/{table_id}", status_code=status.HTTP_204_NO_CONTENT, operation_id="removeTable")
def remove_table(table_id: str) -> Response:
    store.remove_table(table_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{table_id}/release", response_model=RestaurantTable, operation_id="releaseTable")
def release_table(table_id: str) -> RestaurantTable:
    return store.release_table(table_id)
