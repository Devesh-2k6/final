import asyncio
import json
import logging
from typing import Optional, Set
from fastapi import WebSocket
from redis import asyncio as aioredis

logger = logging.getLogger("expirygo.websocket")

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.redis_client: Optional[aioredis.Redis] = None
        self.pubsub_task: Optional[asyncio.Task] = None
        self.channel_name: str = "expirygo:realtime:events"

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"New WebSocket connection. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket disconnected. Total active: {len(self.active_connections)}")

    async def start_pubsub(self, redis_client: aioredis.Redis):
        """Starts background listener on Redis Pub/Sub channel for cluster-wide synchronization."""
        self.redis_client = redis_client
        try:
            self.pubsub_task = asyncio.create_task(self._listen_redis_channel())
            logger.info("Distributed Redis Pub/Sub listener initialized for multi-server synchronization.")
        except Exception as e:
            logger.warning(f"Could not start Redis Pub/Sub listener: {e}")

    async def stop_pubsub(self):
        if self.pubsub_task and not self.pubsub_task.done():
            self.pubsub_task.cancel()
            try:
                await self.pubsub_task
            except asyncio.CancelledError:
                pass

    async def _listen_redis_channel(self):
        if not self.redis_client:
            return
        pubsub = self.redis_client.pubsub()
        await pubsub.subscribe(self.channel_name)
        try:
            async for msg in pubsub.listen():
                if msg and msg.get("type") == "message":
                    data = msg.get("data")
                    if isinstance(data, str):
                        try:
                            parsed = json.loads(data)
                            await self._broadcast_to_local_sockets(parsed)
                        except Exception as e:
                            logger.warning(f"Failed parsing PubSub message: {e}")
        except asyncio.CancelledError:
            await pubsub.unsubscribe(self.channel_name)
        except Exception as e:
            logger.warning(f"Redis PubSub listener encountered error: {e}")

    async def _broadcast_to_local_sockets(self, message: dict):
        if not self.active_connections:
            return
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

    async def broadcast(self, message: dict):
        """Broadcast message to all servers in the cluster via Redis Pub/Sub, or fallback to local sockets."""
        if self.redis_client:
            try:
                json_str = json.dumps(message, default=str)
                await self.redis_client.publish(self.channel_name, json_str)
                return
            except Exception as e:
                logger.warning(f"Failed to publish to Redis PubSub: {e}. Falling back to local broadcast.")
        await self._broadcast_to_local_sockets(message)

    def broadcast_sync(self, message: dict):
        """Thread-safe and sync-safe helper to trigger cluster-wide broadcast."""
        try:
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(self.broadcast(message))
            except RuntimeError:
                pass
        except Exception as e:
            logger.warning(f"Could not dispatch WS broadcast: {e}")

manager = ConnectionManager()
