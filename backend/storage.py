import uuid
import shutil
import re
from pathlib import Path
from typing import Optional
from fastapi import UploadFile, Request
from supabase import create_client, Client
from config import settings

def get_supabase_client() -> Optional[Client]:
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_ANON_KEY
    if not url or not key:
        return None
    if "[YOUR-ANON-KEY-FROM-SUPABASE-DASHBOARD]" in key or "YOUR-" in key or not key.strip():
        return None
    return create_client(url, key)

def upload_product_image(file: UploadFile, request: Optional[Request] = None) -> str:
    raw_ext = (file.filename or "").split(".")[-1] if file.filename and "." in file.filename else "jpg"
    clean_ext = re.sub(r'[^a-zA-Z0-9]', '', raw_ext).lower() or "jpg"
    if len(clean_ext) > 5:
        clean_ext = "jpg"
    file_name = f"{uuid.uuid4().hex}.{clean_ext}"

    # Try Supabase first (if configured)
    supabase = get_supabase_client()
    if supabase:
        try:
            file_content = file.file.read()
            supabase.storage.from_("products").upload(
                file_name, 
                file_content, 
                {"content-type": file.content_type}
            )
            public_url = supabase.storage.from_("products").get_public_url(file_name)
            return public_url
        except Exception as e:
            print(f"Error uploading image to Supabase: {str(e)}")
            # Fall through to local storage fallback

    # Local filesystem fallback with cross-platform pathlib.Path
    try:
        static_dir = Path(__file__).resolve().parent / "static" / "uploads"
        static_dir.mkdir(parents=True, exist_ok=True)
        file_path = static_dir / file_name
        
        # Seek back to 0 in case the file pointer was moved by a failed supabase read
        file.file.seek(0)
        
        # Save to disk
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Return local static URL with forward slashes
        base_url = settings.API_BASE_URL.rstrip("/")
        if request:
            base_url = str(request.base_url).rstrip("/")
            
        return f"{base_url}/static/uploads/{file_name}"
    except Exception as e:
        print(f"Error saving image locally: {str(e)}")
        return f"https://placehold.co/400x300/e2e8f0/64748b?text=Image+Unavailable"
