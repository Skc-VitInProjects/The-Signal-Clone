import json

import pytest
from starlette.websockets import WebSocketDisconnect


def recv_until(ws, msg_type, limit=10):
    for _ in range(limit):
        msg = ws.receive_json()
        if msg.get("type") == msg_type:
            return msg
    raise AssertionError(f"Did not receive a '{msg_type}' event within {limit} messages")


def test_ws_rejects_invalid_token(client):
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws?token=not-a-real-token"):
            pass


def test_ws_ping_pong(client, sarah):
    token = sarah["access_token"]
    with client.websocket_connect(f"/ws?token={token}") as ws:
        first = ws.receive_json()
        assert first["type"] == "user_status"
        assert first["user_id"] == sarah["user"]["id"]
        assert first["is_online"] is True

        ws.send_text(json.dumps({"type": "ping"}))
        pong = recv_until(ws, "pong")
        assert pong["type"] == "pong"


def test_ws_typing_and_read_receipts(client, sarah, alex, demo_user_ids, auth):
    conv = client.post(
        "/api/conversations/direct",
        json={"recipient_id": demo_user_ids["alex_r"]},
        headers=auth(sarah["access_token"]),
    ).json()
    conv_id = conv["id"]

    with client.websocket_connect(f"/ws?token={sarah['access_token']}") as sarah_ws, \
         client.websocket_connect(f"/ws?token={alex['access_token']}") as alex_ws:

        recv_until(sarah_ws, "user_status")  # sarah comes online
        recv_until(sarah_ws, "user_status")  # alex comes online
        recv_until(alex_ws, "user_status")   # alex sees himself online

        sarah_ws.send_text(json.dumps({
            "type": "typing",
            "conversation_id": conv_id,
            "is_typing": True,
        }))
        typing = recv_until(alex_ws, "typing")
        assert typing["conversation_id"] == conv_id
        assert typing["user_id"] == sarah["user"]["id"]
        assert typing["user_name"] == "Sarah Connor"
        assert typing["is_typing"] is True

        sarah_ws.send_text(json.dumps({
            "type": "mark_read",
            "conversation_id": conv_id,
        }))
        read_evt = recv_until(alex_ws, "messages_read")
        assert read_evt["conversation_id"] == conv_id
        assert read_evt["read_by"] == sarah["user"]["id"]


def test_ws_connection_marks_user_online(client, sarah, auth):
    me_before = client.get("/api/auth/me", headers=auth(sarah["access_token"])).json()

    with client.websocket_connect(f"/ws?token={sarah['access_token']}") as ws:
        evt = ws.receive_json()
        assert evt["type"] == "user_status"
        assert evt["user_id"] == sarah["user"]["id"]
        assert evt["is_online"] is True
        assert me_before["username"] == "sarah_c"
