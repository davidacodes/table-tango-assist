from pathlib import Path

from fastapi.testclient import TestClient

from app.factory import create_app


def test_static_frontend_serves_index_and_spa_fallback(tmp_path: Path):
    static_dir = tmp_path / "static"
    static_dir.mkdir()
    (static_dir / "index.html").write_text("<div id=\"root\"></div>", encoding="utf-8")

    client = TestClient(create_app(f"sqlite:///{tmp_path / 'test.db'}", static_dir=static_dir))

    root = client.get("/")
    settings = client.get("/settings")
    api = client.get("/api/parties")

    assert root.status_code == 200
    assert root.text == "<div id=\"root\"></div>"
    assert settings.status_code == 200
    assert settings.text == "<div id=\"root\"></div>"
    assert api.status_code == 401
