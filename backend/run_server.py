import uvicorn
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"Starting Meeva API on http://{host}:{port}", flush=True)
    uvicorn.run("main:app", host=host, port=port, reload=False, log_level="info", app_dir=str(backend_dir))
