"""
Meeva Unified Ecosystem Orchestrator (Web Host + Mobile Expo Go + Backend API)
Runs all three services simultaneously with synchronized LAN IP, live monitoring,
and graceful shutdown.
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
MOBILE_DIR = ROOT_DIR / "mobile"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from clean_ports import free_ports
from get_ip import get_lan_ip, sync_mobile_env

def stream_output(proc, prefix, color_code):
    try:
        for line in iter(proc.stdout.readline, ""):
            if not line:
                break
            sys.stdout.write(f"\033[{color_code}m[{prefix}]\033[0m {line}")
            sys.stdout.flush()
    except Exception:
        pass

def wait_for_port(port, timeout=20):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=1):
                return True
        except (socket.timeout, ConnectionRefusedError, OSError):
            time.sleep(0.5)
    return False

def main():
    print("=" * 70)
    print("  🚀 MEEVA UNIFIED ECOSYSTEM ORCHESTRATOR")
    print("  Simultaneous Web Host + Expo Go Mobile App + FastAPI Backend")
    print("=" * 70)

    # 1. Clean lingering ports
    print("\n[1/5] Ensuring ports 8000, 3000, and 8081 are clean...")
    free_ports()

    # 2. Auto-detect & sync LAN IP
    print("\n[2/5] Detecting network interface and synchronizing IP...")
    lan_ip = get_lan_ip()
    sync_mobile_env(lan_ip)
    print(f"  • Detected Active LAN IP: {lan_ip}")
    print(f"  • Backend API URL:        http://{lan_ip}:8000")
    print(f"  • Web Frontend URL:       http://{lan_ip}:3000")
    print(f"  • Expo Go Metro Packager: exp://{lan_ip}:8081")

    # 3. Ensure database and admin account
    print("\n[3/5] Verifying database schema & platform administrator...")
    try:
        subprocess.run(
            [sys.executable, "-c", "import sys; sys.path.insert(0, 'backend'); from seed_data import ensure_ecosystem_ready; ensure_ecosystem_ready()"],
            cwd=str(ROOT_DIR),
            check=False
        )
    except Exception as e:
        print(f"  [Notice] DB initialization check: {e}")

    # 4. Start Backend API (FastAPI)
    print("\n[4/5] Launching FastAPI Backend Server on http://0.0.0.0:8000...")
    backend_proc = subprocess.Popen(
        [sys.executable, "run_server.py"],
        cwd=str(BACKEND_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    # 5. Start Web Server
    print("      Launching Web Host on http://0.0.0.0:3000...")
    web_proc = subprocess.Popen(
        [sys.executable, "serve_web.py"],
        cwd=str(ROOT_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    # 6. Start Expo Go Metro Bundler
    print(f"\n[5/5] Launching React Native Expo Go Server (exp://{lan_ip}:8081)...")
    mobile_env = os.environ.copy()
    mobile_env["REACT_NATIVE_PACKAGER_HOSTNAME"] = lan_ip
    npx_cmd = "npx.cmd" if sys.platform == "win32" else "npx"
    mobile_proc = subprocess.Popen(
        [npx_cmd, "expo", "start", "--go", "--host", "lan", "-c"],
        cwd=str(MOBILE_DIR),
        env=mobile_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    # Start output streaming threads
    t1 = threading.Thread(target=stream_output, args=(backend_proc, "BACKEND", "36"), daemon=True) # Cyan
    t2 = threading.Thread(target=stream_output, args=(web_proc, "WEB-APP", "32"), daemon=True)   # Green
    t3 = threading.Thread(target=stream_output, args=(mobile_proc, "EXPO-GO", "35"), daemon=True) # Magenta
    t1.start()
    t2.start()
    t3.start()

    # Wait for ports to become active
    print("\n⏳ Verifying services are live...")
    b_ready = wait_for_port(8000, timeout=15)
    w_ready = wait_for_port(3000, timeout=10)
    m_ready = wait_for_port(8081, timeout=30)

    print("\n" + "=" * 70)
    print("  ✨ ALL SERVICES ARE LIVE & CONNECTED SIMULTANEOUSLY!")
    print("=" * 70)
    print(f"  🌐 Web Host:          http://localhost:3000  (LAN: http://{lan_ip}:3000)")
    print(f"  🔌 Backend API:       http://localhost:8000  (Docs: http://localhost:8000/docs)")
    print(f"  📱 Expo Go App:       exp://{lan_ip}:8081")
    print(f"  📲 Web Companion:     http://localhost:3000/mobile (Interactive QR Scanner)")
    print("=" * 70)
    print("\n  👉 Connect your phone with Expo Go:")
    print(f"  1. Connect your phone to the same Wi-Fi network as this PC ({lan_ip}).")
    print(f"  2. Open the Expo Go app on your phone and tap 'Scan QR code'.")
    print(f"  3. Scan the QR code displayed at http://localhost:3000/mobile or in the Expo terminal.\n")

    time.sleep(1)
    webbrowser.open("http://localhost:3000/mobile")

    print("[Press Ctrl+C at any time to gracefully stop all services]\n")

    try:
        while True:
            if backend_proc.poll() is not None:
                print("⚠️ Backend server exited.")
                break
            if web_proc.poll() is not None:
                print("⚠️ Web server exited.")
                break
            if mobile_proc.poll() is not None:
                print("⚠️ Expo Go server exited.")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Stopping all services gracefully...")
    finally:
        for p in (backend_proc, web_proc, mobile_proc):
            try:
                p.terminate()
                p.wait(timeout=2)
            except Exception:
                try:
                    p.kill()
                except Exception:
                    pass
        free_ports()
        print("✅ All services stopped cleanly.")

if __name__ == "__main__":
    main()
