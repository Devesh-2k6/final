@echo off
setlocal enabledelayedexpansion
title ExpiryGo Ecosystem Launcher
echo ============================================================
echo   🚀 EXPIRYGO - UNIFIED ECOSYSTEM LAUNCHER (WEB + MOBILE + API)
echo ============================================================
echo.

:: 1. Auto-detect Wi-Fi IPv4 address and sync configs
for /f "tokens=*" %%i in ('python get_ip.py') do set LAN_IP=%%i

if "%LAN_IP%"=="" (
    set LAN_IP=127.0.0.1
)

echo [Detected Active Network IP]: %LAN_IP%
echo.

:: 2. Ensure Port 8081 is clean
python -c "import subprocess, re; out = subprocess.getoutput('netstat -ano | findstr :8081'); pids = set(re.findall(r'\s+(\d+)\r?$', out, re.M)); [subprocess.run(['taskkill', '/F', '/PID', pid], capture_output=True) for pid in pids if pid != '0']" 2>nul

:: 3. Ensure Database & Admin Account Ready
echo [1/4] Ensuring Database and Administrator Account...
python -c "import sys; sys.path.insert(0, 'backend'); from seed_data import ensure_admin_account; ensure_admin_account()"
echo.

:: 4. Start Backend API
echo [2/4] Starting Backend FastAPI Server (http://0.0.0.0:8000)...
start "ExpiryGo Backend API" cmd /k "title ExpiryGo Backend API && cd backend && python run_server.py"
echo.

:: 5. Start Next.js Web App
echo [3/4] Starting Next.js Web Server (http://localhost:3000)...
start "ExpiryGo Web App" cmd /k "title ExpiryGo Web App && python serve_web.py"
echo.

:: 6. Start React Native Expo Go Mobile Server with QR Scanner
echo [4/4] Starting React Native Expo Go Mobile Server (%LAN_IP%:8081)...
start "ExpiryGo Mobile App" cmd /k "title ExpiryGo Expo Go Server && cd mobile && set REACT_NATIVE_PACKAGER_HOSTNAME=%LAN_IP% && npx expo start --go --host lan -c"
echo.

:: 7. Open Browser Companion
timeout /t 2 /nobreak >nul
start http://localhost:3000/mobile

echo ============================================================
echo   ✅ SUCCESS! All services launched and synchronized:
echo   • Web App:       http://localhost:3000   (LAN: http://%LAN_IP%:3000)
echo   • Backend API:   http://localhost:8000   (Docs: http://localhost:8000/docs)
echo   • Mobile App:    Expo Go (Scan QR in Mobile window or open exp://%LAN_IP%:8081)
echo   • Web Companion: Opened http://localhost:3000/mobile (QR Scanner & Sync Lab)
echo.
echo   📱 INSTRUCTIONS FOR EXPO GO SCANNER:
echo   1. Open 'Expo Go' app on your phone (connected to same Wi-Fi %LAN_IP%).
echo   2. Tap 'Scan QR code' and scan the QR code in the Expo window or at http://localhost:3000/mobile.
echo   3. If router has client isolation, connect phone to Mobile Hotspot and re-run!
echo ============================================================
echo.
pause
