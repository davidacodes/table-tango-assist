from __future__ import annotations

import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

DATABASE_URL_ENV = "NEXTTABLE_DATABASE_URL"
DEFAULT_DATABASE_URL = "postgresql+psycopg://nexttable:nexttable@localhost:5432/nexttable"

_engine: Engine | None = None
_session_factory: sessionmaker[Session] | None = None


class Base(DeclarativeBase):
    pass


def database_url() -> str:
    return normalize_database_url(os.getenv(DATABASE_URL_ENV, DEFAULT_DATABASE_URL))


def normalize_database_url(url: str) -> str:
    if url.startswith("postgres://"):
        return f"postgresql+psycopg://{url.removeprefix('postgres://')}"
    if url.startswith("postgresql://"):
        return f"postgresql+psycopg://{url.removeprefix('postgresql://')}"
    return url


def configure_database(url: str | None = None) -> None:
    global _engine, _session_factory

    resolved_url = normalize_database_url(url) if url is not None else database_url()
    connect_args = {"check_same_thread": False} if resolved_url.startswith("sqlite") else {}
    _engine = create_engine(resolved_url, connect_args=connect_args)
    _session_factory = sessionmaker(bind=_engine, autoflush=False, expire_on_commit=False)


def engine() -> Engine:
    if _engine is None:
        configure_database()
    assert _engine is not None
    return _engine


def session_factory() -> sessionmaker[Session]:
    if _session_factory is None:
        configure_database()
    assert _session_factory is not None
    return _session_factory


def get_db() -> Generator[Session]:
    with session_factory()() as session:
        yield session


def create_tables() -> None:
    Base.metadata.create_all(bind=engine())
