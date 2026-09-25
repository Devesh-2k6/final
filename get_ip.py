import socket
import os
import re
from pathlib import Path

def get_lan_ip() -> str:
    """Auto-detect the primary active network IPv4 address (Wi-Fi or LAN)."""
    # 1. Preferred method: Check routing interface via UDP probe
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip and not ip.startswith("127.") and not ip.startswith("169.254."):
            return ip
    except Exception:
        pass

    # 2. Windows Fallback: Find adapter with an active Default Gateway (bypasses VMware/VirtualBox virtual adapters)
    if os.name == "nt":
        try:
            import subprocess
            out = subprocess.getoutput("ipconfig")
            sections = re.split(r"\n(?=[A-Za-z])", out)
            for sec in sections:
                if "Default Gateway" in sec and not re.search(r"Default Gateway[.\s]+:\s*$", sec, re.M):
                    m = re.search(r"IPv4 Address[.\s]+:\s*([0-9.]+)", sec)
                    if m and not m.group(1).startswith("127.") and not m.group(1).startswith("169.254."):
                        return m.group(1)
        except Exception:
            pass

    # 3. Hostname resolution fallback
    try:
        hostname = socket.gethostname()
        ip = socket.gethostbyname(hostname)
        if ip and not ip.startswith("127."):
            return ip
    except Exception:
        pass

    return "127.0.0.1"

def sync_mobile_env(ip: str) -> None:
    """Updates mobile/src/config/env.ts and out/mobile.html with the detected LAN IP."""
    root = Path(__file__).resolve().parent

    # 1. Update React Native / Expo Go configuration
    env_ts_path = root / "mobile" / "src" / "config" / "env.ts"
    if env_ts_path.exists():
        try:
            content = env_ts_path.read_text(encoding="utf-8")
            updated = re.sub(
                r'export const CURRENT_LAN_IP = "[^"]*";',
                f'export const CURRENT_LAN_IP = "{ip}";',
                content
            )
            if updated != content:
                env_ts_path.write_text(updated, encoding="utf-8")
        except Exception as e:
            print(f"[WARN] Could not update mobile/src/config/env.ts: {e}")

    # 2. Update Web Host Static export for Expo QR companion if present
    mobile_html_path = root / "out" / "mobile.html"
    if mobile_html_path.exists():
        try:
            html = mobile_html_path.read_text(encoding="utf-8")
            html = re.sub(r'exp://192\.168\.\d+\.\d+:8081', f'exp://{ip}:8081', html)
            html = re.sub(r'http://192\.168\.\d+\.\d+:8081', f'http://{ip}:8081', html)
            html = re.sub(r'Wi-Fi: <!-- -->192\.168\.\d+\.\d+', f'Wi-Fi: <!-- -->{ip}', html)
            mobile_html_path.write_text(html, encoding="utf-8")
        except Exception as e:
            pass

if __name__ == "__main__":
    lan_ip = get_lan_ip()
    sync_mobile_env(lan_ip)
    print(lan_ip)
