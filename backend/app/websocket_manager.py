from typing import Dict, Set, List
import json
import logging
from fastapi import WebSocket
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # user_id -> Set[WebSocket] (allows multiple tabs/devices)
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # WebSocket -> user_id reverse lookup
        self.socket_user: Dict[WebSocket, str] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        self.socket_user[websocket] = user_id
        logger.info(f"User {user_id} connected via WebSocket. Total connections for user: {len(self.active_connections[user_id])}")

    def disconnect(self, websocket: WebSocket):
        user_id = self.socket_user.pop(websocket, None)
        if user_id and user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
            logger.info(f"User {user_id} disconnected from WebSocket.")
        return user_id

    def is_user_online(self, user_id: str) -> bool:
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            dead_sockets = set()
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Error sending message to {user_id}: {e}")
                    dead_sockets.add(connection)
            for dead in dead_sockets:
                self.active_connections[user_id].discard(dead)

    async def broadcast_to_users(self, message: dict, user_ids: List[str]):
        for user_id in user_ids:
            await self.send_personal_message(message, user_id)

    async def broadcast_all(self, message: dict):
        for user_id in list(self.active_connections.keys()):
            await self.send_personal_message(message, user_id)

manager = ConnectionManager()
