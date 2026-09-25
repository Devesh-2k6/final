@echo off
setlocal enabledelayedexpansion
title Meeva Ecosystem Launcher
echo ============================================================
echo   🚀 MEEVA - UNIFIED ECOSYSTEM LAUNCHER (WEB + MOBILE + API)
echo ============================================================
echo.

:: 1. Auto-detect Wi-Fi IPv4 address and sync configs
for /f "tokens=*" %%i in ('python get_ip.py') do set LAN_IP=%%i

if "%LAN_IP%"=="" (
    set LAN_IP=127.0.0.1
)

echo [Detected Active Network IP]: %LAN_IP%
echo.

:: 2. Ensure Ports 8000, 3000, and 8081 are clean
echo [Cleaning Ports 8000, 3000, 8081]...
python clean_ports.py
echo.

:: 3. Ensure Database & Admin Account Ready
echo [1/4] Ensuring Database and Administrator Account...
python -c "import sys; sys.path.insert(0, 'backend'); from seed_data import ensure_ecosystem_ready; ensure_ecosystem_ready()"
echo.

:: 4. Start Backend API
echo [2/4] Starting Backend FastAPI Server (http://0.0.0.0:8000)...
start "Meeva Backend API" cmd /k "title Meeva Backend API && cd backend && python run_server.py"
echo.

:: 5. Start Next.js Web App
echo [3/4] Starting Next.js Web Server (http://localhost:3000)...
start "Meeva Web App" cmd /k "title Meeva Web App && python serve_web.py"
echo.

:: 6. Start React Native Expo Go Mobile Server with QR Scanner
echo [4/4] Starting React Native Expo Go Mobile Server (%LAN_IP%:8081)...
start "Meeva Mobile App" cmd /k "title Meeva Expo Go Server && cd mobile && set REACT_NATIVE_PACKAGER_HOSTNAME=%LAN_IP% && npx expo start --go --host lan -c"
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
