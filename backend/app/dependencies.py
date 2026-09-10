from collections.abc import Generator

from fastapi import Depends
from sqlalchemy.orm import Session

from .database import get_db
from .store import RestaurantStore


def get_store(session: Session = Depends(get_db)) -> Generator[RestaurantStore]:
    yield RestaurantStore(session)
