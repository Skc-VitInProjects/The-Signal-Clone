import uuid


def test_root_endpoint(client):
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "online"
    assert data["docs"] == "/docs"


def test_health_endpoint(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"


def test_demo_users(client):
    r = client.get("/api/auth/demo-users")
    assert r.status_code == 200
    users = r.json()
    usernames = [u["username"] for u in users]
    assert len(users) >= 5
    for expected in ["sarah_c", "alex_r", "david_k", "maria_s", "elena_r"]:
        assert expected in usernames
    sarah = next(u for u in users if u["username"] == "sarah_c")
    assert sarah["display_name"] == "Sarah Connor"
    assert sarah["is_online"] is True


def test_login_with_valid_otp(client):
    r = client.post("/api/auth/login", json={"identifier": "sarah_c", "otp": "123456"})
    assert r.status_code == 200
    body = r.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["username"] == "sarah_c"


def test_login_with_invalid_otp(client):
    r = client.post("/api/auth/login", json={"identifier": "sarah_c", "otp": "000000"})
    assert r.status_code == 400
    assert "Invalid OTP" in r.json()["detail"]


def test_login_unknown_user_with_wrong_otp(client):
    r = client.post("/api/auth/login", json={"identifier": "no_such_user_xyz", "otp": "000000"})
    assert r.status_code == 404


def test_login_auto_creates_account_with_valid_otp(client, auth):
    identifier = f"newbie_{uuid.uuid4().hex[:8]}"
    r = client.post("/api/auth/login", json={"identifier": identifier, "otp": "123456"})
    assert r.status_code == 200
    token = r.json()["access_token"]

    me = client.get("/api/auth/me", headers=auth(token))
    assert me.status_code == 200
    assert me.json()["username"] == identifier


def test_me_requires_authentication(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_with_token(client, sarah, auth):
    r = client.get("/api/auth/me", headers=auth(sarah["access_token"]))
    assert r.status_code == 200
    assert r.json()["username"] == "sarah_c"


def test_invalid_token_rejected(client, auth):
    r = client.get("/api/auth/me", headers=auth("not.a.valid.token"))
    assert r.status_code == 401


def test_register_and_password_login(client):
    username = f"reg_{uuid.uuid4().hex[:8]}"

    r = client.post("/api/auth/register", json={"username": username, "display_name": "Reg Tester"})
    assert r.status_code == 200
    assert r.json()["access_token"]

    dup = client.post("/api/auth/register", json={"username": username, "display_name": "Dup"})
    assert dup.status_code == 400

    ok = client.post("/api/auth/login", json={"identifier": username, "password": "signal123"})
    assert ok.status_code == 200

    bad = client.post("/api/auth/login", json={"identifier": username, "password": "wrong-password"})
    assert bad.status_code == 400
