@echo off
echo ============================================================
echo   🚀 EXPIRYGO - FULL ECOSYSTEM LAUNCHER (WEB + MOBILE + API)
echo ============================================================
echo.
echo [1/4] Initializing Database & Seed Data...
python backend/seed_data.py
echo.
echo [2/4] Starting Backend API Server (http://0.0.0.0:8000)...
start "ExpiryGo Backend API" cmd /k "cd backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo.
echo [3/4] Starting React / Next.js Web App (http://localhost:3000)...
start "ExpiryGo Web App" cmd /k "npm run dev"
echo.
echo [4/4] Starting React Native (Expo) Mobile App...
start "ExpiryGo Mobile App" cmd /k "npm run mobile"
echo.
echo ============================================================
echo   ✅ SUCCESS! All services are running:
echo   • Web App:     http://localhost:3000
echo   • Backend API: http://localhost:8000/docs
echo   • Mobile App:  Expo Dev Server (Press 'w' for web, 'a' for Android, 'i' for iOS)
echo ============================================================
pause
