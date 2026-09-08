@echo off
setlocal enabledelayedexpansion
title ExpiryGo Web Ecosystem (Backend + Frontend)
echo ============================================================
echo   🚀 EXPIRYGO - FULL-STACK WEB LAUNCHER (FRONTEND + BACKEND)
echo ============================================================
echo.

:: 1. Auto-detect Wi-Fi / Local LAN IP
for /f "tokens=*" %%i in ('python get_ip.py 2^>nul') do set LAN_IP=%%i
if "%LAN_IP%"=="" (
    set LAN_IP=127.0.0.1
)

echo [Network Detection]
echo   • Localhost:       http://localhost:3000
echo   • Wi-Fi / LAN IP:  http://%LAN_IP%:3000
echo   • Backend API:     http://localhost:8000
echo   • API Swagger:     http://localhost:8000/docs
echo.

:: 2. Initialize Database and Seed Admin User
echo [1/3] Ensuring Backend Database & Administrator Account...
python -c "import sys; sys.path.insert(0, 'backend'); from seed_data import ensure_admin_account; ensure_admin_account()"
echo.

:: 3. Start Backend FastAPI Server
echo [2/3] Starting FastAPI Backend Server on port 8000...
start "ExpiryGo Backend API (Port 8000)" cmd /k "title ExpiryGo Backend API && cd backend && python run_server.py"
echo.

:: 4. Start Next.js Frontend Web Server
echo [3/3] Starting Next.js Web Frontend on port 3000...
start "ExpiryGo Web Frontend (Port 3000)" cmd /k "title ExpiryGo Web Frontend && npm run dev"
echo.

:: 5. Open Web Browser
echo Waiting for servers to initialize...
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo ============================================================
echo   ✅ SUCCESS! ExpiryGo Web Application is Live:
echo.
echo   🌐 Web Frontend:    http://localhost:3000
echo   📱 Mobile Devices:  http://%LAN_IP%:3000 (same Wi-Fi)
echo   🔌 Backend API:     http://localhost:8000
echo   📖 API Docs:        http://localhost:8000/docs
echo ============================================================
echo.
echo Press any key to exit this launcher window (servers remain running).
pause >nul
