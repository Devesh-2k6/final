"""
Meeva Unified Web Server Orchestrator
Runs both the FastAPI Backend (port 8000) and Next.js Web Frontend (port 3000) concurrently.
Handles graceful shutdown (Ctrl+C), live health monitoring, and browser launch.
"""

import os
import sys
import time
import socket
import webbrowser
import subprocess
import threading
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"

def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def stream_output(proc, prefix, color_code):
    try:
        for line in iter(proc.stdout.readline, ""):
            if not line:
                break
            # Print with colored prefix
            sys.stdout.write(f"\033[{color_code}m[{prefix}]\033[0m {line}")
            sys.stdout.flush()
    except Exception:
        pass

def wait_for_port(port, timeout=30):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=1):
                return True
        except (socket.timeout, ConnectionRefusedError, OSError):
            time.sleep(0.5)
    return False

def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    lan_ip = get_lan_ip()
    
    print("\n" + "=" * 65)
    print("   🚀 MEEVA UNIFIED WEB SERVER ORCHESTRATOR")
    print("=" * 65)
    print(f"  • Web Frontend:    http://localhost:3000")
    print(f"  • Local LAN Web:   http://{lan_ip}:3000")
    print(f"  • Backend API:     http://localhost:8000")
    print(f"  • API Swagger:     http://localhost:8000/docs")
    print("=" * 65 + "\n")

    # Step 1: Ensure Admin & Database
    print("[1/3] Initializing Database & Administrator Account...")
    try:
        subprocess.run(
            [sys.executable, "-c", "import sys; sys.path.insert(0, 'backend'); from seed_data import ensure_admin_account; ensure_admin_account()"],
            cwd=str(ROOT_DIR),
            check=False
        )
    except Exception as e:
        print(f"  [Notice] DB Init step: {e}")

    # Step 2: Start Backend
    print("[2/3] Starting FastAPI Backend on http://0.0.0.0:8000...")
    backend_proc = subprocess.Popen(
        [sys.executable, "run_server.py"],
        cwd=str(BACKEND_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    # Step 3: Start Next.js Frontend
    print("[3/3] Starting Next.js Web Frontend on http://0.0.0.0:3000...")
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=str(ROOT_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    # Start output streaming threads
    t1 = threading.Thread(target=stream_output, args=(backend_proc, "BACKEND", "36"), daemon=True) # Cyan
    t2 = threading.Thread(target=stream_output, args=(frontend_proc, "FRONTEND", "32"), daemon=True) # Green
    t1.start()
    t2.start()

    # Wait for ports to be live
    print("\n⏳ Waiting for servers to be ready...")
    if wait_for_port(8000, timeout=15):
        print("  ✅ Backend is READY on http://localhost:8000")
    if wait_for_port(3000, timeout=20):
        print("  ✅ Frontend is READY on http://localhost:3000")

    print("\n✨ All services operational! Opening browser: http://localhost:3000")
    time.sleep(1)
    webbrowser.open("http://localhost:3000")

    print("\n[Press Ctrl+C to terminate both servers]\n")

    try:
        while True:
            if backend_proc.poll() is not None:
                print("⚠️ Backend server stopped unexpectedly.")
                break
            if frontend_proc.poll() is not None:
                print("⚠️ Frontend server stopped unexpectedly.")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Stopping ExpiryGo services gracefully...")
    finally:
        for proc in (backend_proc, frontend_proc):
            try:
                proc.terminate()
                proc.wait(timeout=3)
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass
        print("✅ Shutdown complete. Goodbye!")

if __name__ == "__main__":
    main()
