# NextTable Waitlist App

Build NextTable, an internal restaurant waitlist and table management tablet web app.

Key requirements:
1. Architecture & Services:
- Tablet-first, touch-friendly UI with split-screen layout (Left: Waitlist with quick-entry form above; Right: Table availability/status).
- Centralize all backend calls into a clean services layer interface with a fully functional in-memory / local storage mock implementation so the entire app works seamlessly without an external backend.
- Comprehensive unit/integration tests for business logic (wait estimation, table recommendation, state transitions).

2. Shared Restaurant Login:
- Single shared restaurant login gate for all staff.

3. Quick Entry & Adding Parties:
- Always-visible quick-entry form above waitlist: Guest name, Phone number, Party size, Arrival time.
- Returning guest detection: matching phone number shows selectable match (e.g., "John Smith — returning guest") to auto-fill name.

4. Waitlist & Status Workflow:
- Row displays: Guest name, Party size, Arrival time, Estimated wait, Status.
- Estimated wait formula: (Parties ahead) × (Default seating interval in minutes, configurable in settings). Changing party size does not alter original wait estimate.
- Workflow: Waiting → Notified (manual notify button, records notification time) → Seated / Left / No-show. Seated, Left, and No-show immediately remove party from active list.

5. Table Management & Seating:
- Tables display: Table number, Capacity, Status (Available or Occupied with current party e.g., "Table 4 • 4 seats • Occupied • Smith (3)").
- Seating flow: Clicking Seat shows available tables that can fit the party, recommending the smallest available table that fits. Host confirms assignment -> table becomes Occupied -> party removed from active waitlist.
- Releasing table: Staff manually mark occupied table as Available when guests leave.

6. Configuration / Settings:
- Screen to configure seating interval (minutes), and add, edit, remove tables with capacities.

7. Party Editing:
- Staff can edit party size only (name and phone locked; wait estimate unchanged).


## Development

You need:

- Node.js and npm for the frontend
- `uv` for the Python/FastAPI backend
- PostgreSQL for the backend database

Install dependencies from the repository root:

```sh
make frontend-install
make backend-sync
```

Run the app with two terminal tabs from the repository root.

First start Postgres:

```sh
docker compose up -d db
```

Terminal 1:

```sh
make backend
```

Terminal 2:

```sh
make frontend
```

The backend runs at:

```text
http://127.0.0.1:8000
```

The frontend runs at the `Local:` URL printed by Vite. It is usually:

```text
http://127.0.0.1:8080
```

If port `8080` is already in use, Vite will print another local URL, such as
`http://127.0.0.1:8081/`.

The shared restaurant passcode is:

```text
1234
```

The frontend talks to the backend at:

```text
http://127.0.0.1:8000/api
```

To point the frontend at a different backend:

```sh
VITE_API_BASE_URL="http://your-backend-host/api" make frontend
```

The backend uses Postgres. The default local database URL is:

```text
postgresql+psycopg://nexttable:nexttable@localhost:5432/nexttable
```

You can override it with `NEXTTABLE_DATABASE_URL`:

```sh
NEXTTABLE_DATABASE_URL="postgresql+psycopg://user:password@host:5432/database" make backend
```

`postgres://...` and `postgresql://...` URLs are accepted and normalized to the
psycopg SQLAlchemy driver.

To run the full production-style stack with Postgres and the backend-served
frontend:

```sh
docker compose up --build
```

Then open `http://127.0.0.1:8000`.

Run tests:

```sh
make backend-test
cd frontend && npm exec vitest run
```

Build the frontend:

```sh
make frontend-build
```
