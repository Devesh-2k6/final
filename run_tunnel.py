import subprocess
import re
import sys
import time
import os
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

def main():
    print("=" * 60)
    print("EXPIRYGO MOBILE - CLOUDFLARE ZERO-CONFIG TUNNEL LAUNCHER")
    print("=" * 60)
    print("\n[1/3] Ensuring Metro Bundler is running on port 8081...")
    
    # Clean up stale 8081
    try:
        out = subprocess.getoutput('netstat -ano | findstr :8081')
        pids = set(re.findall(r'\s+(\d+)\r?$', out, re.M))
        for pid in pids:
            if pid != '0':
                subprocess.run(['taskkill', '/F', '/PID', pid], capture_output=True)
    except Exception:
        pass

    mobile_dir = Path(__file__).resolve().parent / "mobile"
    
    # Start Expo Metro in background
    metro_proc = subprocess.Popen(
        ["npx", "expo", "start", "--go", "--localhost", "-c"],
        cwd=str(mobile_dir),
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )

    print("  [OK] Metro bundler initiated. Waiting for startup...")
    time.sleep(3)

    print("\n[2/3] Starting Global Cloudflare Quick Tunnel (Bypasses all Wi-Fi / Router / Firewall limits)...")
    
    cloudflared_proc = subprocess.Popen(
        ["npx", "-y", "cloudflared", "tunnel", "--url", "http://localhost:8081"],
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    tunnel_url = None
    start_time = time.time()
    
    for line in iter(cloudflared_proc.stdout.readline, ''):
        match = re.search(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com', line)
        if match:
            tunnel_url = match.group(0)
            break
        if time.time() - start_time > 30:
            break

    if not tunnel_url:
        print("[ERROR] Could not obtain Cloudflare tunnel URL.")
        sys.exit(1)

    expo_tunnel_uri = tunnel_url.replace("https://", "exp://")
    print(f"\n[3/3] Cloudflare Tunnel Ready!")
    print("=" * 60)
    print(f"Public Tunnel URL: {tunnel_url}")
    print(f"Expo Go URI:      {expo_tunnel_uri}")
    print("=" * 60)
    
    print("\nSCAN THE QR CODE BELOW WITH EXPO GO (Works on Wi-Fi, 4G, 5G, Anywhere):\n")
    try:
        import qrcode
        qr = qrcode.QRCode(border=1)
        qr.add_data(expo_tunnel_uri)
        qr.make(fit=True)
        qr.print_ascii(invert=True)
    except Exception as e:
        print(f"URL for Expo Go: {expo_tunnel_uri}")

    print("\n" + "=" * 60)
    print(">> In Expo Go: Tap 'Scan QR code' and scan the code above!")
    print(f">> Or in Expo Go tap 'Enter URL manually' and enter: {expo_tunnel_uri}")
    print("=" * 60)
    print("\nPress Ctrl+C to stop tunnel.")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down tunnel and metro...")
        cloudflared_proc.terminate()
        metro_proc.terminate()

if __name__ == "__main__":
    main()
