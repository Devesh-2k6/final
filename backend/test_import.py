print("1")
from dotenv import load_dotenv
print("2")
load_dotenv()
print("3")
import os
import math
import logging
import time
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from typing import Annotated, Optional
print("4")
from redis import asyncio as aioredis
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.decorator import cache
print("5")
from fastapi import Depends, FastAPI, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload, contains_eager
print("6")
import schemas
print("7")
from auth_service import create_access_token
print("8")
from db.models import Product
print("9")
from db.session import get_db, init_db
print("10")
from storage import upload_product_image
print("11")
