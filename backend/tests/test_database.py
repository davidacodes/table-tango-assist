from pathlib import Path

from sqlalchemy import func, select

from app.database import DATABASE_URL_ENV, database_url, normalize_database_url, session_factory
from app.factory import create_app
from app.orm import PartyRow, RestaurantTableRow


def test_database_url_can_be_configured_with_environment(monkeypatch, tmp_path: Path):
    db_path = tmp_path / "configured.db"
    monkeypatch.setenv(DATABASE_URL_ENV, f"sqlite:///{db_path}")

    create_app()

    assert db_path.exists()
    with session_factory()() as session:
        assert session.scalar(select(func.count()).select_from(RestaurantTableRow)) == 6
        assert session.scalar(select(func.count()).select_from(PartyRow)) == 3


def test_default_database_url_uses_postgres(monkeypatch):
    monkeypatch.delenv(DATABASE_URL_ENV, raising=False)

    assert database_url().startswith("postgresql+psycopg://")


def test_postgres_url_aliases_use_psycopg_driver():
    assert (
        normalize_database_url("postgres://user:pass@host:5432/db")
        == "postgresql+psycopg://user:pass@host:5432/db"
    )
    assert (
        normalize_database_url("postgresql://user:pass@host:5432/db")
        == "postgresql+psycopg://user:pass@host:5432/db"
    )


def test_existing_database_is_not_reseeded(tmp_path: Path):
    db_path = tmp_path / "existing.db"

    create_app(f"sqlite:///{db_path}")
    create_app(f"sqlite:///{db_path}")

    with session_factory()() as session:
        assert session.scalar(select(func.count()).select_from(RestaurantTableRow)) == 6
        assert session.scalar(select(func.count()).select_from(PartyRow)) == 3
