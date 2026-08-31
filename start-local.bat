@echo off
echo ============================================================
echo   🚀 EXPIRYGO - ONE-CLICK DEMO LAUNCHER
echo ============================================================
echo.
echo [1/3] Initializing Database and Seed Data...
python backend/seed_data.py
echo.
echo [2/3] Starting Backend API Server (http://0.0.0.0:8000)...
start "ExpiryGo Backend API" cmd /k "cd backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo.
echo [3/3] Starting Frontend Next.js Web App (http://localhost:3000)...
start "ExpiryGo Frontend App" cmd /k "npm run dev"
echo.
echo ============================================================
echo   ✅ SUCCESS! Both Backend and Frontend servers are running.
echo   • App UI: http://localhost:3000
echo   • API Docs: http://localhost:8000/docs
echo ============================================================
pause
