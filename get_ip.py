import socket
import os
import re
from pathlib import Path

def get_lan_ip() -> str:
    """Auto-detect the primary active network IPv4 address (Wi-Fi or LAN)."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Connect to public DNS to find default egress interface
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip and not ip.startswith("127.") and not ip.startswith("169.254."):
            return ip
    except Exception:
        pass

    try:
        hostname = socket.gethostname()
        ip = socket.gethostbyname(hostname)
        if ip and not ip.startswith("127."):
            return ip
    except Exception:
        pass

    return "127.0.0.1"

def sync_mobile_env(ip: str) -> None:
    """Updates mobile/src/config/env.ts with the detected LAN IP."""
    env_ts_path = Path(__file__).resolve().parent / "mobile" / "src" / "config" / "env.ts"
    if not env_ts_path.exists():
        return
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

if __name__ == "__main__":
    lan_ip = get_lan_ip()
    sync_mobile_env(lan_ip)
    print(lan_ip)
