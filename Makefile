.PHONY: help backend backend-sync backend-test frontend frontend-install frontend-build

help:
	@printf "NextTable commands:\n"
	@printf "  make backend          Run the FastAPI backend on http://127.0.0.1:8000\n"
	@printf "  make backend-sync     Install/sync backend dependencies with uv\n"
	@printf "  make backend-test     Run backend tests\n"
	@printf "  make frontend         Run the frontend dev server\n"
	@printf "  make frontend-install Install frontend dependencies\n"
	@printf "  make frontend-build   Build the frontend\n"

backend:
	cd backend && uv run uvicorn app.main:app --reload

backend-sync:
	cd backend && uv sync

backend-test:
	cd backend && uv run pytest

frontend:
	cd frontend && npm run dev

frontend-install:
	cd frontend && npm install

frontend-build:
	cd frontend && npm run build
