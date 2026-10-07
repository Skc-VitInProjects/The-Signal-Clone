import uuid


def test_search_by_display_name(client, sarah, auth):
    r = client.get("/api/users/search", params={"q": "alex"}, headers=auth(sarah["access_token"]))
    assert r.status_code == 200
    names = [u["display_name"] for u in r.json()]
    assert "Alex Rivera" in names


def test_search_excludes_self(client, sarah, auth):
    r = client.get("/api/users/search", params={"q": "sarah"}, headers=auth(sarah["access_token"]))
    assert r.status_code == 200
    usernames = [u["username"] for u in r.json()]
    assert "sarah_c" not in usernames


def test_search_by_phone(client, sarah, auth):
    r = client.get("/api/users/search", params={"q": "555-0102"}, headers=auth(sarah["access_token"]))
    assert r.status_code == 200
    usernames = [u["username"] for u in r.json()]
    assert "david_k" in usernames


def test_search_requires_auth(client):
    assert client.get("/api/users/search", params={"q": "alex"}).status_code == 401


def test_contacts_list(client, sarah, auth):
    r = client.get("/api/users/contacts", headers=auth(sarah["access_token"]))
    assert r.status_code == 200
    contacts = r.json()
    assert len(contacts) >= 4
    usernames = [c["contact_user"]["username"] for c in contacts]
    assert "alex_r" in usernames
    for c in contacts:
        assert c["contact_user"]["display_name"]


def test_add_contact_idempotent(client, sarah, auth):
    friend = f"buddy_{uuid.uuid4().hex[:8]}"
    reg = client.post("/api/auth/register", json={"username": friend, "display_name": "Buddy Test"})
    assert reg.status_code == 200

    before = len(client.get("/api/users/contacts", headers=auth(sarah["access_token"])).json())

    r = client.post(
        "/api/users/contacts",
        json={"contact_username_or_phone": friend, "nickname": "Buddy"},
        headers=auth(sarah["access_token"]),
    )
    assert r.status_code == 200
    assert r.json()["contact_user"]["username"] == friend

    after = len(client.get("/api/users/contacts", headers=auth(sarah["access_token"])).json())
    assert after == before + 1

    again = client.post(
        "/api/users/contacts",
        json={"contact_username_or_phone": friend},
        headers=auth(sarah["access_token"]),
    )
    assert again.status_code == 200
    assert again.json()["id"] == r.json()["id"]

    self_add = client.post(
        "/api/users/contacts",
        json={"contact_username_or_phone": "sarah_c"},
        headers=auth(sarah["access_token"]),
    )
    assert self_add.status_code == 400


def test_add_unknown_contact(client, sarah, auth):
    r = client.post(
        "/api/users/contacts",
        json={"contact_username_or_phone": "ghost_user_404"},
        headers=auth(sarah["access_token"]),
    )
    assert r.status_code == 404


def test_update_profile(client, sarah, auth):
    r = client.put(
        "/api/users/profile",
        json={"about": "Status set by automated tests", "display_name": "Sarah Connor"},
        headers=auth(sarah["access_token"]),
    )
    assert r.status_code == 200
    assert r.json()["about"] == "Status set by automated tests"

    me = client.get("/api/auth/me", headers=auth(sarah["access_token"]))
    assert me.json()["about"] == "Status set by automated tests"
