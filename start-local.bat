@echo off
title Meeva Local Launcher
echo ============================================================
echo   🚀 MEEVA - ONE-CLICK LOCAL LAUNCHER
echo ============================================================
echo.
echo [1/3] Initializing Database & Administrator...
python -c "import sys; sys.path.insert(0, 'backend'); from seed_data import ensure_admin_account; ensure_admin_account()"
echo.
echo [2/3] Starting Backend API Server (http://0.0.0.0:8000)...
start "Meeva Backend API" cmd /k "cd backend && python run_server.py"
echo.
echo [3/3] Starting Frontend Next.js Web App (http://localhost:3000)...
start "Meeva Frontend App" cmd /k "npm run dev"
echo.
timeout /t 3 /nobreak >nul
start http://localhost:3000
echo ============================================================
echo   ✅ SUCCESS! Both Backend and Frontend servers are running.
echo   • Web App:  http://localhost:3000
echo   • API Docs: http://localhost:8000/docs
echo   • Mobile:   http://localhost:3000/mobile
echo ============================================================
pause
