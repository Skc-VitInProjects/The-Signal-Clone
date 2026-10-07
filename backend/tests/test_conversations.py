import pytest


@pytest.fixture(scope="module")
def created_group(client, sarah, demo_user_ids, auth):
    r = client.post(
        "/api/conversations/group",
        json={
            "name": "Testers Guild",
            "description": "Created by pytest",
            "member_ids": [demo_user_ids["alex_r"], demo_user_ids["david_k"]],
        },
        headers=auth(sarah["access_token"]),
    )
    assert r.status_code == 200, r.text
    return r.json()


def _direct_with(client, token, recipient_id):
    r = client.post(
        "/api/conversations/direct",
        json={"recipient_id": recipient_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text
    return r.json()


def test_list_conversations(client, sarah, auth):
    r = client.get("/api/conversations", headers=auth(sarah["access_token"]))
    assert r.status_code == 200
    convs = r.json()
    assert len(convs) >= 4

    names = [c["name"] for c in convs if c["name"]]
    assert "Core Protocol Team \U0001f6e1\ufe0f" in names
    assert "Alex Rivera" in names
    assert "Maria Santos" in names

    group_count = sum(1 for c in convs if c["is_group"])
    assert group_count >= 2

    for c in convs:
        assert c["unread_count"] >= 0
        assert len(c["participants"]) >= 2


def test_list_conversations_requires_auth(client):
    assert client.get("/api/conversations").status_code == 401


def test_direct_conversation_is_idempotent(client, sarah, demo_user_ids, auth):
    token = sarah["access_token"]
    first = _direct_with(client, token, demo_user_ids["alex_r"])
    second = _direct_with(client, token, demo_user_ids["alex_r"])

    assert first["id"] == second["id"]
    assert first["is_group"] is False
    assert len(first["participants"]) == 2
    assert first["name"] == "Alex Rivera"


def test_direct_with_self_rejected(client, sarah, auth):
    r = client.post(
        "/api/conversations/direct",
        json={"recipient_id": sarah["user"]["id"]},
        headers=auth(sarah["access_token"]),
    )
    assert r.status_code == 400


def test_direct_with_unknown_recipient(client, sarah, auth):
    r = client.post(
        "/api/conversations/direct",
        json={"recipient_id": "00000000-0000-0000-0000-000000000000"},
        headers=auth(sarah["access_token"]),
    )
    assert r.status_code == 404


def test_create_group(client, sarah, created_group, auth):
    g = created_group
    assert g["is_group"] is True
    assert g["name"] == "Testers Guild"
    assert g["description"] == "Created by pytest"
    assert len(g["participants"]) == 3

    roles = {p["user_id"]: p["role"] for p in g["participants"]}
    assert roles[sarah["user"]["id"]] == "admin"
    assert all(role == "member" for uid, role in roles.items() if uid != sarah["user"]["id"])

    last = g["last_message"]
    assert last is not None
    assert last["message_type"] == "system"
    assert "created the group" in last["content"]


def test_conversation_detail(client, sarah, demo_user_ids, auth):
    direct = _direct_with(client, sarah["access_token"], demo_user_ids["alex_r"])
    r = client.get(f"/api/conversations/{direct['id']}", headers=auth(sarah["access_token"]))
    assert r.status_code == 200
    detail = r.json()
    assert detail["id"] == direct["id"]
    assert len(detail["participants"]) == 2


def test_detail_forbidden_for_non_participant(client, sarah, elena, demo_user_ids, auth):
    create = client.post(
        "/api/conversations/group",
        json={"name": "No Sarah Allowed", "member_ids": [demo_user_ids["david_k"]]},
        headers=auth(elena["access_token"]),
    )
    assert create.status_code == 200
    group_id = create.json()["id"]

    r = client.get(f"/api/conversations/{group_id}", headers=auth(sarah["access_token"]))
    assert r.status_code == 403

    missing = client.get("/api/conversations/nope-does-not-exist", headers=auth(sarah["access_token"]))
    assert missing.status_code == 403


def test_add_and_remove_group_members(client, sarah, elena, maria, demo_user_ids, created_group, auth):
    group_id = created_group["id"]
    maria_id = demo_user_ids["maria_s"]
    elena_id = demo_user_ids["elena_r"]
    alex_id = demo_user_ids["alex_r"]

    outsider = client.post(
        f"/api/conversations/{group_id}/members",
        json={"user_id": maria_id},
        headers=auth(maria["access_token"]),
    )
    assert outsider.status_code == 403

    added = client.post(
        f"/api/conversations/{group_id}/members",
        json={"user_id": elena_id},
        headers=auth(sarah["access_token"]),
    )
    assert added.status_code == 200
    assert added.json()["message"] == "Member added successfully"

    duplicate = client.post(
        f"/api/conversations/{group_id}/members",
        json={"user_id": elena_id},
        headers=auth(sarah["access_token"]),
    )
    assert duplicate.status_code == 200
    assert duplicate.json()["message"] == "User is already a member"

    non_admin_remove = client.delete(
        f"/api/conversations/{group_id}/members/{alex_id}",
        headers=auth(elena["access_token"]),
    )
    assert non_admin_remove.status_code == 403

    detail = client.get(f"/api/conversations/{group_id}", headers=auth(sarah["access_token"])).json()
    member_ids = [p["user_id"] for p in detail["participants"]]
    assert elena_id in member_ids
    assert len(member_ids) == 4

    removed = client.delete(
        f"/api/conversations/{group_id}/members/{elena_id}",
        headers=auth(sarah["access_token"]),
    )
    assert removed.status_code == 200
    assert removed.json()["message"] == "Member removed"

    detail_after = client.get(f"/api/conversations/{group_id}", headers=auth(sarah["access_token"])).json()
    assert len(detail_after["participants"]) == 3


def test_update_disappearing_timer(client, sarah, demo_user_ids, auth):
    token = sarah["access_token"]
    conv = _direct_with(client, token, demo_user_ids["maria_s"])

    r = client.put(
        f"/api/conversations/{conv['id']}",
        json={"disappearing_timer": 300},
        headers=auth(token),
    )
    assert r.status_code == 200
    assert r.json()["disappearing_timer"] == 300

    messages = client.get(f"/api/messages/{conv['id']}", headers=auth(token)).json()
    system_notes = [m for m in messages if m["message_type"] == "system"]
    assert any("disappearing messages to 300 seconds" in m["content"] for m in system_notes)

    off = client.put(
        f"/api/conversations/{conv['id']}",
        json={"disappearing_timer": 0},
        headers=auth(token),
    )
    assert off.status_code == 200
    assert off.json()["disappearing_timer"] == 0


def test_group_rename_creates_system_message(client, sarah, created_group, auth):
    token = sarah["access_token"]
    group_id = created_group["id"]

    r = client.put(
        f"/api/conversations/{group_id}",
        json={"name": "Testers Guild Renamed"},
        headers=auth(token),
    )
    assert r.status_code == 200
    assert r.json()["name"] == "Testers Guild Renamed"

    messages = client.get(f"/api/messages/{group_id}", headers=auth(token)).json()
    assert any(
        m["message_type"] == "system" and "changed the group name" in m["content"]
        for m in messages
    )


def test_mark_as_read(client, sarah, demo_user_ids, auth):
    conv = _direct_with(client, sarah["access_token"], demo_user_ids["maria_s"])
    r = client.post(f"/api/conversations/{conv['id']}/read", headers=auth(sarah["access_token"]))
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
