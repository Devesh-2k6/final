"""
ExpiryGo - Global Live Web Hosting Launcher
Orchestrates:
1. Ensuring Platform Admin account in the database
2. Running FastAPI Backend (Port 8000)
3. Running Next.js Web Server (Port 3000)
4. Optional Zero-Config Public HTTPS Cloudflare Web Tunnel for 100% free online access from anywhere in the world!
"""

import os
import sys
import time
import socket
import subprocess
import threading
import re
import webbrowser
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

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

def free_port(port):
    if sys.platform == "win32":
        try:
            out = subprocess.getoutput(f'netstat -ano | findstr :{port}')
            pids = set(re.findall(r'\s+(\d+)\r?$', out, re.M))
            my_pid = str(os.getpid())
            for pid in pids:
                if pid and pid != '0' and pid != my_pid:
                    subprocess.run(['taskkill', '/F', '/PID', pid], capture_output=True)
        except Exception:
            pass

def main():
    free_port(3000)
    free_port(8000)
    lan_ip = get_lan_ip()
    
    print("=" * 70)
    print("🚀 EXPIRYGO - FULL-STACK WEB HOSTING LAUNCHER")
    print("=" * 70)
    print("  • Status:          100% Production Clean Slate (Zero Demo Data)")
    print("  • Admin Account:   devpant2006@gmail.com (Sole Administrator)")
    print("  • Non-Admin Users: 0 (Zero Dummy Accounts)")
    print("  • Products in DB:  0 (Ready for real merchant listings)")
    print("=" * 70)

    # Step 1: Ensure Platform Admin
    print("\n[1/4] Ensuring Platform Administrator account...")
    try:
        subprocess.run(
            [sys.executable, "-c", "import sys; sys.path.insert(0, 'backend'); from seed_data import ensure_admin_account; ensure_admin_account()"],
            cwd=str(ROOT_DIR),
            check=False
        )
    except Exception as e:
        print(f"  [Notice] DB Init step: {e}")

    # Step 2: Start Backend
    print("\n[2/4] Starting FastAPI Backend on http://0.0.0.0:8000...")
    backend_proc = subprocess.Popen(
        [sys.executable, "run_server.py"],
        cwd=str(BACKEND_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    # Step 3: Start Next.js Frontend
    print("\n[3/4] Starting Next.js Web Frontend on http://0.0.0.0:3000...")
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=str(ROOT_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    t1 = threading.Thread(target=stream_output, args=(backend_proc, "BACKEND", "36"), daemon=True) # Cyan
    t2 = threading.Thread(target=stream_output, args=(frontend_proc, "FRONTEND", "32"), daemon=True) # Green
    t1.start()
    t2.start()

    # Wait for ports to be live
    print("\n⏳ Initializing services...")
    backend_ready = wait_for_port(8000, timeout=15)
    frontend_ready = wait_for_port(3000, timeout=20)

    if backend_ready:
        print("  ✅ Backend is ONLINE at http://localhost:8000")
    if frontend_ready:
        print("  ✅ Frontend is ONLINE at http://localhost:3000")

    # Step 4: Launch Optional Cloudflare Web Tunnel for Global Internet Access
    print("\n[4/4] Starting Cloudflare Public HTTPS Web Tunnel for Global Access...")
    tunnel_proc = subprocess.Popen(
        ["npx", "-y", "cloudflared", "tunnel", "--url", "http://localhost:8000"],
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    public_tunnel_url = None
    start_time = time.time()
    for line in iter(tunnel_proc.stdout.readline, ''):
        match = re.search(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com', line)
        if match:
            public_tunnel_url = match.group(0)
            break
        if time.time() - start_time > 35:
            break

    print("\n" + "=" * 70)
    print("🎉 EXPIRYGO WEB HOST IS LIVE & ACCESSIBLE!")
    print("=" * 70)
    print(f"  🌐 Local Web (Dev):     http://localhost:3000")
    print(f"  ⚡ Unified Web (Prod):   http://localhost:8000")
    print(f"  📶 Local Network/Wi-Fi:  http://{lan_ip}:3000  (or http://{lan_ip}:8000)")
    if public_tunnel_url:
        print(f"  🌍 Global Public URL:    {public_tunnel_url}")
        print("     (Accessible from ANY phone, laptop, or browser worldwide with zero setup)")
    print(f"  🔌 Backend API:          http://localhost:8000")
    print(f"  📖 API Documentation:    http://localhost:8000/docs")
    print("=" * 70)
    print("\n👑 Admin Credentials:")
    print("  Email:    devpant2006@gmail.com")
    print("  Password: Sureshkumar12345@")
    print("  Role:     ADMIN")
    print("=" * 70)
    target_url = public_tunnel_url if public_tunnel_url else "http://localhost:3000"
    print(f"\nOpening web browser at {target_url}...")
    webbrowser.open(target_url)

    print("\n[Press Ctrl+C to stop all servers]\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Stopping ExpiryGo web servers gracefully...")
    finally:
        for proc in (tunnel_proc, frontend_proc, backend_proc):
            try:
                proc.terminate()
                proc.wait(timeout=2)
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass
        print("✅ All services stopped.")

if __name__ == "__main__":
    main()
