@echo off
echo ============================================================
echo   🚀 EXPIRYGO - FULL ECOSYSTEM LAUNCHER (WEB + MOBILE + API)
echo ============================================================
echo.
echo [1/4] Initializing Clean Database (0 Demo Products)...
py backend/clean_slate.py 2>nul || python backend/clean_slate.py
echo.
echo [2/4] Starting Backend FastAPI Server (http://0.0.0.0:8000)...
start "ExpiryGo Backend API" cmd /k "cd backend && (py -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 || python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000)"
echo.
echo [3/4] Starting Next.js Web Frontend (http://localhost:3000)...
start "ExpiryGo Web App" cmd /k "npm run dev"
echo.
echo [4/4] Starting React Native Expo Go Mobile Server (Tunnel Mode)...
start "ExpiryGo Mobile App" cmd /k "cd mobile && npx expo start --go --tunnel -c"
echo.
echo ============================================================
echo   ✅ SUCCESS! All services launched and connected:
echo   • Web App:     http://localhost:3000
echo   • Backend API: http://localhost:8000 (Docs: http://localhost:8000/docs)
echo   • Mobile App:  Expo Go (Scan QR in Mobile window or open exp://192.168.1.7:8081)
echo ============================================================
pause
