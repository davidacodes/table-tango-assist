from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi.testclient import TestClient

from app.factory import create_app


def client() -> TestClient:
    temp_dir = TemporaryDirectory()
    db_path = Path(temp_dir.name) / "test.db"
    test_client = TestClient(create_app(f"sqlite:///{db_path}"))
    test_client.temp_dir = temp_dir  # type: ignore[attr-defined]
    return test_client


def login(client: TestClient) -> dict[str, str]:
    response = client.post("/api/auth/login", json={"passcode": "1234"})
    assert response.status_code == 200
    body = response.json()
    assert body["authenticated"] is True
    token = body["accessToken"]
    return {"Authorization": f"Bearer {token}"}


def test_login_rejects_bad_passcode_and_accepts_shared_passcode():
    c = client()

    bad = c.post("/api/auth/login", json={"passcode": "0000"})
    assert bad.status_code == 200
    assert bad.json() == {"authenticated": False, "accessToken": None, "tokenType": "bearer"}

    headers = login(c)
    session = c.get("/api/auth/session", headers=headers)
    assert session.status_code == 200
    assert session.json() == {"authenticated": True}


def test_authenticated_endpoints_require_bearer_token():
    c = client()

    response = c.get("/api/parties")

    assert response.status_code == 401
    assert response.json() == {"error": "Authentication is required."}


def test_seeded_store_has_parties_and_tables():
    c = client()
    headers = login(c)

    parties = c.get("/api/parties", headers=headers)
    tables = c.get("/api/tables", headers=headers)

    assert parties.status_code == 200
    assert tables.status_code == 200
    assert len(parties.json()) >= 3
    assert len(tables.json()) >= 6


def test_waitlist_flow_and_locked_estimate():
    c = client()
    headers = login(c)

    settings = c.patch("/api/settings", headers=headers, json={"seatingIntervalMinutes": 20})
    assert settings.status_code == 200

    created = c.post(
        "/api/parties",
        headers=headers,
        json={
            "name": "  Brown  ",
            "phone": "  555-0199  ",
            "partySize": 2,
            "arrivalTime": "2026-01-01T18:00:00Z",
        },
    )
    assert created.status_code == 201
    party = created.json()
    original_estimate = party["estimatedWaitMinutes"]
    assert party["name"] == "Brown"
    assert party["phone"] == "555-0199"
    assert party["status"] == "waiting"

    resized = c.patch(f"/api/parties/{party['id']}/size", headers=headers, json={"partySize": 6})
    assert resized.status_code == 200
    assert resized.json()["partySize"] == 6
    assert resized.json()["estimatedWaitMinutes"] == original_estimate

    notified = c.post(f"/api/parties/{party['id']}/notify", headers=headers)
    assert notified.status_code == 200
    assert notified.json()["status"] == "notified"
    assert notified.json()["notifiedAt"]

    left = c.patch(f"/api/parties/{party['id']}/status", headers=headers, json={"status": "left"})
    assert left.status_code == 200
    assert left.json()["status"] == "left"
    assert left.json()["closedAt"]


def test_seating_and_release_flow():
    c = client()
    headers = login(c)

    party_response = c.post(
        "/api/parties",
        headers=headers,
        json={
            "name": "Lee",
            "phone": "555-0161",
            "partySize": 2,
            "arrivalTime": "2026-01-01T18:00:00Z",
        },
    )
    party = party_response.json()
    table = next(
        table
        for table in c.get("/api/tables", headers=headers).json()
        if table["capacity"] >= 2 and not table.get("occupiedBy")
    )

    seated = c.post(f"/api/parties/{party['id']}/seat", headers=headers, json={"tableId": table["id"]})

    assert seated.status_code == 200
    seated_body = seated.json()
    assert seated_body["party"]["status"] == "seated"
    assert seated_body["party"]["tableId"] == table["id"]
    assert seated_body["table"]["occupiedBy"]["partyId"] == party["id"]

    released = c.post(f"/api/tables/{table['id']}/release", headers=headers)
    assert released.status_code == 200
    assert released.json().get("occupiedBy") is None


def test_table_crud():
    c = client()
    headers = login(c)

    created = c.post("/api/tables", headers=headers, json={"number": "12", "capacity": 6})
    assert created.status_code == 201
    table = created.json()

    updated = c.patch(f"/api/tables/{table['id']}", headers=headers, json={"number": "12A", "capacity": 10})
    assert updated.status_code == 200
    assert updated.json()["number"] == "12A"
    assert updated.json()["capacity"] == 10

    deleted = c.delete(f"/api/tables/{table['id']}", headers=headers)
    assert deleted.status_code == 204
    tables = c.get("/api/tables", headers=headers).json()
    assert all(existing["id"] != table["id"] for existing in tables)
