import time
import json
import logging
import os
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from websocket_manager import manager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
from redis import asyncio as aioredis
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend

from config import settings
from db.session import init_db
from routers import (
    health,
    auth,
    shops,
    products,
    reservations,
    orders,
    interactions,
    analytics,
)
from routers.errors import register_error_handlers

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("expirygo.api")

@asynccontextmanager
async def lifespan(_app: FastAPI):
    start = time.perf_counter()
    init_db()
    elapsed = time.perf_counter() - start
    logger.info(f"Backend database initialized in {elapsed:.3f} seconds.")
    
    # Detect if running under tests
    import sys
    import os
    is_testing = "pytest" in sys.modules or os.getenv("TESTING") == "True"
    
    # Initialize Redis Cache
    try:
        redis = aioredis.from_url(settings.REDIS_URL, encoding="utf8", decode_responses=True)
        await redis.ping()
        FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache", enable=not is_testing)
        logger.info(f"Redis cache initialized successfully (enabled: {not is_testing}).")
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}. Falling back to InMemoryBackend for local caching.")
        from fastapi_cache.backends.inmemory import InMemoryBackend
        FastAPICache.init(InMemoryBackend(), prefix="fastapi-cache", enable=not is_testing)
        
    yield

app = FastAPI(
    title="ExpiryGo API",
    description="ExpiryGo API — Supabase + JWT Authentication + ML Forecast & Optimization",
    version="1.0.0",
    lifespan=lifespan
)

# Gzip compress large responses
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS Configuration - Optimized for React + Capacitor Phone Deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for mobile deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Structured request/response logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    duration = time.perf_counter() - start_time
    
    log_data = {
        "method": request.method,
        "path": request.url.path,
        "status_code": response.status_code,
        "duration_ms": round(duration * 1000, 2),
        "client_ip": request.client.host if request.client else "unknown"
    }
    
    logger.info(json.dumps(log_data))
    return response

# Register centralized error handlers
register_error_handlers(app)

# Real-time WebSocket notifications endpoint
@app.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Include all subrouters
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(auth.user_router)       # Profile endpoint /users/me
app.include_router(shops.router)
app.include_router(products.router)
app.include_router(products.upload_router)   # Upload endpoint /upload/image
app.include_router(reservations.router)
app.include_router(orders.router)
app.include_router(interactions.router)
app.include_router(analytics.router)

# Serve local static uploads fallback
os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")
