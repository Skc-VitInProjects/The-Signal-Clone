import base64
import time

import pytest

# 1x1 transparent PNG
PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


@pytest.fixture(scope="module")
def direct_conv(client, sarah, demo_user_ids, auth):
    r = client.post(
        "/api/conversations/direct",
        json={"recipient_id": demo_user_ids["alex_r"]},
        headers=auth(sarah["access_token"]),
    )
    assert r.status_code == 200, r.text
    return r.json()


def _headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_get_messages_history(client, sarah, direct_conv, auth):
    token = sarah["access_token"]
    r = client.get(f"/api/messages/{direct_conv['id']}", headers=auth(token))
    assert r.status_code == 200
    messages = r.json()

    assert len(messages) >= 3
    assert all(m["sender"]["username"] in ("sarah_c", "alex_r") for m in messages)

    with_reply = next((m for m in messages if m["reply_to"]), None)
    assert with_reply is not None, "Seeded reply message missing"
    assert "security patch" in with_reply["reply_to"]["content"]

    with_reactions = [m for m in messages if m["reactions"]]
    assert with_reactions, "Seeded reactions missing"
    emojis = [r_["emoji"] for m in with_reactions for r_ in m["reactions"]]
    assert "\U0001f525" in emojis


def test_history_requires_participation(client, sarah, auth):
    r = client.get("/api/messages/some-nonexistent-conversation", headers=auth(sarah["access_token"]))
    assert r.status_code == 403


def test_send_message(client, sarah, direct_conv, auth):
    token = sarah["access_token"]
    r = client.post(
        "/api/messages",
        json={"conversation_id": direct_conv["id"], "content": "Hello from pytest"},
        headers=auth(token),
    )
    assert r.status_code == 200
    msg = r.json()
    assert msg["content"] == "Hello from pytest"
    assert msg["message_type"] == "text"
    assert msg["status"] in ("sent", "delivered")
    assert msg["sender"]["username"] == "sarah_c"
    assert msg["is_deleted"] is False

    history = client.get(f"/api/messages/{direct_conv['id']}", headers=auth(token)).json()
    assert any(m["id"] == msg["id"] for m in history)


def test_send_message_requires_participation(client, sarah, alex, demo_user_ids, auth):
    r = client.post(
        "/api/conversations/group",
        json={"name": "Messages Exclusion", "member_ids": [demo_user_ids["maria_s"]]},
        headers=auth(alex["access_token"]),
    )
    assert r.status_code == 200
    group_id = r.json()["id"]

    blocked = client.post(
        "/api/messages",
        json={"conversation_id": group_id, "content": "intruding"},
        headers=auth(sarah["access_token"]),
    )
    assert blocked.status_code == 403

    history = client.get(f"/api/messages/{group_id}", headers=auth(sarah["access_token"]))
    assert history.status_code == 403


def test_send_reply_with_preview(client, sarah, direct_conv, auth):
    token = sarah["access_token"]
    history = client.get(f"/api/messages/{direct_conv['id']}", headers=auth(token)).json()
    parent = next(m for m in history if "security patch" in m["content"])

    r = client.post(
        "/api/messages",
        json={
            "conversation_id": direct_conv["id"],
            "content": "Replying to the patch note",
            "reply_to_id": parent["id"],
        },
        headers=auth(token),
    )
    assert r.status_code == 200
    msg = r.json()
    assert msg["reply_to_id"] == parent["id"]
    assert msg["reply_to"]["content"] == parent["content"]
    assert msg["reply_to"]["sender_name"] == "Alex Rivera"


def test_reaction_toggle(client, sarah, direct_conv, auth):
    token = sarah["access_token"]
    sent = client.post(
        "/api/messages",
        json={"conversation_id": direct_conv["id"], "content": "React to me"},
        headers=auth(token),
    ).json()

    added = client.post(
        f"/api/messages/{sent['id']}/reactions",
        json={"emoji": "\u2764\ufe0f"},
        headers=auth(token),
    )
    assert added.status_code == 200
    body = added.json()
    assert body["action"] == "added"
    assert any(r_["emoji"] == "\u2764\ufe0f" and r_["user_name"] == "Sarah Connor" for r_ in body["reactions"])

    removed = client.post(
        f"/api/messages/{sent['id']}/reactions",
        json={"emoji": "\u2764\ufe0f"},
        headers=auth(token),
    )
    assert removed.status_code == 200
    assert removed.json()["action"] == "removed"
    assert not any(r_["emoji"] == "\u2764\ufe0f" for r_ in removed.json()["reactions"])


def test_delete_message(client, sarah, alex, direct_conv, auth):
    token = sarah["access_token"]
    sent = client.post(
        "/api/messages",
        json={"conversation_id": direct_conv["id"], "content": "Message to be deleted"},
        headers=auth(token),
    ).json()

    wrong_user = client.delete(f"/api/messages/{sent['id']}", headers=auth(alex["access_token"]))
    assert wrong_user.status_code == 403

    deleted = client.delete(f"/api/messages/{sent['id']}", headers=auth(token))
    assert deleted.status_code == 200
    assert deleted.json()["status"] == "ok"

    history = client.get(f"/api/messages/{direct_conv['id']}", headers=auth(token)).json()
    assert not any(m["id"] == sent["id"] for m in history)


def test_upload_and_send_attachment(client, sarah, direct_conv, auth):
    token = sarah["access_token"]

    image = client.post(
        "/api/messages/upload",
        files={"file": ("pixel.png", PNG_BYTES, "image/png")},
        headers=auth(token),
    )
    assert image.status_code == 200
    image_data = image.json()
    assert image_data["file_url"].startswith("/uploads/")
    assert image_data["message_type"] == "image"
    assert image_data["file_size"] == len(PNG_BYTES)

    served = client.get(image_data["file_url"])
    assert served.status_code == 200
    assert served.content == PNG_BYTES

    doc = client.post(
        "/api/messages/upload",
        files={"file": ("notes.txt", b"hello signal", "text/plain")},
        headers=auth(token),
    )
    assert doc.status_code == 200
    assert doc.json()["message_type"] == "file"

    as_message = client.post(
        "/api/messages",
        json={
            "conversation_id": direct_conv["id"],
            "content": "Shared an image",
            "message_type": "image",
            "file_url": image_data["file_url"],
            "file_name": image_data["file_name"],
            "file_size": image_data["file_size"],
        },
        headers=auth(token),
    )
    assert as_message.status_code == 200
    assert as_message.json()["file_url"] == image_data["file_url"]


def test_disappearing_message_is_purged(client, sarah, demo_user_ids, auth):
    token = sarah["access_token"]
    conv = client.post(
        "/api/conversations/direct",
        json={"recipient_id": demo_user_ids["maria_s"]},
        headers=auth(token),
    ).json()

    set_timer = client.put(
        f"/api/conversations/{conv['id']}",
        json={"disappearing_timer": 1},
        headers=auth(token),
    )
    assert set_timer.status_code == 200

    sent = client.post(
        "/api/messages",
        json={"conversation_id": conv["id"], "content": "This message will vanish"},
        headers=auth(token),
    )
    assert sent.status_code == 200
    assert sent.json()["expires_at"] is not None
    message_id = sent.json()["id"]

    time.sleep(1.5)

    history = client.get(f"/api/messages/{conv['id']}", headers=auth(token)).json()
    assert not any(m["id"] == message_id for m in history)

    client.put(
        f"/api/conversations/{conv['id']}",
        json={"disappearing_timer": 0},
        headers=auth(token),
    )
