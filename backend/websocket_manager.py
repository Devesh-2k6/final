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

        import json
        json_str = json.dumps(message, default=str)
        dead_connections = []

        for connection in list(self.active_connections):
            try:
                await connection.send_text(json_str)
            except Exception as e:
                logger.warning(f"Failed to send WS message: {e}")
                dead_connections.append(connection)

        for connection in dead_connections:
            self.disconnect(connection)

    def broadcast_sync(self, message: dict):
        """Thread-safe and sync-safe helper to trigger WebSocket broadcast."""
        if not self.active_connections:
            return
        try:
            import asyncio
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(self.broadcast(message))
            except RuntimeError:
                pass  # No running event loop in background thread / sync context
        except Exception as e:
            logger.warning(f"Could not dispatch WS broadcast: {e}")

manager = ConnectionManager()
