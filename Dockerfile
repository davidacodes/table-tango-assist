FROM node:22-bookworm-slim AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build:static


FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS app

WORKDIR /app/backend

ENV NEXTTABLE_STATIC_DIR=/app/frontend \
    NEXTTABLE_DATABASE_URL=postgresql+psycopg://nexttable:nexttable@db:5432/nexttable \
    PATH="/app/backend/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-cache

COPY backend/app ./app
COPY --from=frontend-builder /app/frontend/dist /app/frontend

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
