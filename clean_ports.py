"""
Utility to ensure ports 8000 (Backend API), 3000 (Web Frontend), and 8081 (Expo Metro)
are completely freed before launching the unified ecosystem.
"""

import os
import re
import subprocess
import sys

def free_ports(ports=(8000, 3000, 8081)):
    if sys.platform != "win32":
        return
    try:
        out = subprocess.getoutput("netstat -ano")
        my_pid = str(os.getpid())
        pids = set()
        for line in out.splitlines():
            if any(f":{p} " in line for p in ports):
                match = re.search(r"\s+(\d+)\r?$", line)
                if match:
                    pids.add(match.group(1))
        for pid in pids:
            if pid and pid != "0" and pid != my_pid:
                res = subprocess.run(["taskkill", "/F", "/PID", pid], capture_output=True, text=True)
                if res.returncode == 0:
                    print(f"  [Cleaned] Freed port from lingering PID {pid}")
    except Exception as e:
        print(f"  [Notice] Port cleanup check: {e}")

if __name__ == "__main__":
    free_ports()
