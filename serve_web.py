import http.server
import socketserver
import os
import sys
from pathlib import Path

PORT = 3000
DIRECTORY = Path(__file__).resolve().parent / "out"

class CleanUrlHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY), **kwargs)

    def do_GET(self):
        # Clean URL rewrite: /deals -> /deals.html, /auth -> /auth.html
        path = self.path.split("?")[0].rstrip("/")
        if path:
            html_file = DIRECTORY / f"{path.lstrip('/')}.html"
            if html_file.exists():
                query = ("?" + self.path.split("?")[1]) if "?" in self.path else ""
                self.path = f"{path}.html{query}"
        super().do_GET()

if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    
    # Allow socket address reuse immediately
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("0.0.0.0", PORT), CleanUrlHTTPRequestHandler) as httpd:
        print(f"🚀 ExpiryGo Web App running at http://localhost:{PORT} (Serving {DIRECTORY})", flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...", flush=True)
