from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Use a set for O(1) removals and to avoid duplicates
        self.active_connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"New WebSocket connection. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket disconnected. Total active: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        if not self.active_connections:
            return

        # Create a list to avoid "Set changed size during iteration" errors
        # and to track dead sockets
        dead_connections = []

        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send WS message: {e}")
                dead_connections.append(connection)

        for connection in dead_connections:
            self.disconnect(connection)

manager = ConnectionManager()
