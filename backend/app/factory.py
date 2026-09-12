import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import FileResponse

from .database import configure_database
from .routers import auth, parties, settings, tables
from .store import init_store

STATIC_DIR_ENV = "NEXTTABLE_STATIC_DIR"


class FrontendStaticFiles(StaticFiles):
    def __init__(self, directory: str | os.PathLike[str]):
        self.index_path = Path(directory) / "index.html"
        super().__init__(directory=directory, html=True)

    async def get_response(self, path: str, scope: dict) -> FileResponse:
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code != 404:
                raise
            return FileResponse(self.index_path)


def static_directory(path: str | os.PathLike[str] | None = None) -> Path | None:
    configured = path or os.getenv(STATIC_DIR_ENV)
    if not configured:
        return None

    directory = Path(configured)
    return directory if (directory / "index.html").is_file() else None


def create_app(database_url: str | None = None, static_dir: str | os.PathLike[str] | None = None) -> FastAPI:
    configure_database(database_url)
    init_store()

    app = FastAPI(title="NextTable API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1):\d+$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth.router, prefix="/api")
    app.include_router(settings.router, prefix="/api")
    app.include_router(parties.router, prefix="/api")
    app.include_router(tables.router, prefix="/api")

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(status_code=400, content={"error": str(exc)})

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
        if isinstance(exc.detail, dict) and "error" in exc.detail:
            content = exc.detail
        else:
            content = {"error": str(exc.detail)}
        return JSONResponse(status_code=exc.status_code, content=content, headers=exc.headers)

    frontend_dir = static_directory(static_dir)
    if frontend_dir is not None:
        app.mount("/", FrontendStaticFiles(frontend_dir), name="frontend")

    return app
