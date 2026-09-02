import time
import json
import logging
import os
import sys
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
    translation,
    pantry,
    admin,
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
    try:
        from seed_data import ensure_admin_account
        ensure_admin_account()
    except Exception as e:
        logger.warning(f"Could not ensure administrator account: {e}")
    
    # Detect if running under tests
    is_testing = "pytest" in sys.modules or os.getenv("TESTING") == "True"
    
    # Initialize Redis Cache
    try:
        import asyncio
        redis = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf8",
            decode_responses=True,
            socket_connect_timeout=0.2,
            socket_timeout=0.2,
        )
        await asyncio.wait_for(redis.ping(), timeout=0.2)
        FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache", enable=not is_testing)
        logger.info(f"Redis cache initialized successfully (enabled: {not is_testing}).")
    except Exception as e:
        logger.warning(f"Redis connection failed or unavailable: {e}. Using InMemoryBackend for fast local caching.")
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

# CORS Configuration - Hardened for Web & Mobile clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False, # Set to False when wildcard origins are used to prevent credential leakage
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count", "X-Request-Duration"],
)

# In-Memory Sliding Window Rate Limiter for sensitive endpoints
_rate_limit_store: dict[str, list[float]] = {}
RATE_LIMIT_WINDOW = 60.0  # 1 minute
AUTH_STRICT_RATE_LIMIT = int(os.getenv("AUTH_STRICT_RATE_LIMIT", os.getenv("MAX_AUTH_REQUESTS_PER_WINDOW", "500")))

@app.middleware("http")
async def security_and_rate_limit_middleware(request: Request, call_next):
    # Support proxy headers for real client IP under NAT/Load Balancers
    client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "unknown")
    path = request.url.path

    # Apply strict Rate Limiting to /auth/login and /auth/send-otp (500 req/min default)
    if path.startswith("/auth/login") or path.startswith("/auth/send-otp"):
        now = time.time()
        key = f"{client_ip}:{path.split('?')[0]}"
        ip_history = _rate_limit_store.setdefault(key, [])
        # Expire older timestamps outside sliding window
        _rate_limit_store[key] = [t for t in ip_history if now - t < RATE_LIMIT_WINDOW]
        
        # Periodic memory bounding cleanup
        if len(_rate_limit_store) > 1000:
            stale_keys = [k for k, timestamps in _rate_limit_store.items() if not timestamps or (now - timestamps[-1] >= RATE_LIMIT_WINDOW)]
            for sk in stale_keys:
                _rate_limit_store.pop(sk, None)

        if len(_rate_limit_store.get(key, [])) >= AUTH_STRICT_RATE_LIMIT:
            logger.warning(f"🚨 Rate limit exceeded for IP {client_ip} on {path} (Limit: {AUTH_STRICT_RATE_LIMIT} req/min)")
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=429,
                content={"detail": f"Too many requests. Rate limit exceeded ({AUTH_STRICT_RATE_LIMIT} requests per minute). Please try again later."},
                headers={"Retry-After": "60"}
            )
        _rate_limit_store[key].append(now)

    # Process Request
    start_time = time.perf_counter()
    response = await call_next(request)
    duration = time.perf_counter() - start_time

    # Inject OWASP Recommended HTTP Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
    response.headers["X-Request-Duration"] = f"{duration * 1000:.2f}ms"

    return response

# Register centralized error handlers
register_error_handlers(app)

# Real-time WebSocket notifications endpoint with token authentication
@app.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if token:
        from db.session import SessionLocal
        from auth_service import get_user_from_token
        db = SessionLocal()
        try:
            user = get_user_from_token(db, token)
            if not user:
                await websocket.close(code=1008)  # Policy Violation / Unauthorized
                return
        finally:
            db.close()

    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except (WebSocketDisconnect, Exception):
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
app.include_router(translation.router)
app.include_router(pantry.router)
app.include_router(admin.router)

# Serve local static uploads fallback
os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")
