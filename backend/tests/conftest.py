import os
import tempfile
from pathlib import Path

# Route the app at a throwaway SQLite database BEFORE any app import,
# so tests never touch the real backend/signal.db.
_TEST_DB_DIR = tempfile.mkdtemp(prefix="signal_clone_tests_")
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_TEST_DB_DIR) / 'test_signal.db'}"

import pytest
from fastapi.testclient import TestClient

from app.main import app


def login(client, identifier, otp="123456"):
    resp = client.post("/api/auth/login", json={"identifier": identifier, "otp": otp})
    assert resp.status_code == 200, resp.text
    return resp.json()


@pytest.fixture(scope="session")
def client():
    # Entering the context runs app lifespan: creates tables + seeds demo data.
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def auth():
    def _headers(token: str) -> dict:
        return {"Authorization": f"Bearer {token}"}
    return _headers


@pytest.fixture(scope="session")
def sarah(client):
    return login(client, "sarah_c")


@pytest.fixture(scope="session")
def alex(client):
    return login(client, "alex_r")


@pytest.fixture(scope="session")
def maria(client):
    return login(client, "maria_s")


@pytest.fixture(scope="session")
def elena(client):
    return login(client, "elena_r")


@pytest.fixture(scope="session")
def demo_user_ids(client):
    users = client.get("/api/auth/demo-users").json()
    return {u["username"]: u["id"] for u in users}
