from pathlib import Path

from sqlalchemy import func, select

from app.database import DATABASE_URL_ENV, session_factory
from app.main import create_app
from app.orm import PartyRow, RestaurantTableRow


def test_database_url_can_be_configured_with_environment(monkeypatch, tmp_path: Path):
    db_path = tmp_path / "configured.db"
    monkeypatch.setenv(DATABASE_URL_ENV, f"sqlite:///{db_path}")

    create_app()

    assert db_path.exists()
    with session_factory()() as session:
        assert session.scalar(select(func.count()).select_from(RestaurantTableRow)) == 6
        assert session.scalar(select(func.count()).select_from(PartyRow)) == 3


def test_existing_database_is_not_reseeded(tmp_path: Path):
    db_path = tmp_path / "existing.db"

    create_app(f"sqlite:///{db_path}")
    create_app(f"sqlite:///{db_path}")

    with session_factory()() as session:
        assert session.scalar(select(func.count()).select_from(RestaurantTableRow)) == 6
        assert session.scalar(select(func.count()).select_from(PartyRow)) == 3
