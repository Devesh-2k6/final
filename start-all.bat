@echo off
echo ============================================================
echo   🚀 EXPIRYGO - FULL ECOSYSTEM LAUNCHER (WEB + MOBILE + API)
echo ============================================================
echo.
echo [1/4] Initializing Database and Demo Data...
python backend/seed_data.py
echo.
echo [2/4] Starting Backend FastAPI Server (http://0.0.0.0:8000)...
start "ExpiryGo Backend API" cmd /k "cd backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo.
echo [3/4] Starting Next.js Web Frontend (http://localhost:3000)...
start "ExpiryGo Web App" cmd /k "npm run dev"
echo.
echo [4/4] Starting React Native Expo Go Mobile Server (Host: LAN)...
start "ExpiryGo Mobile App" cmd /k "cd mobile && npx expo start --go --host lan -c"
echo.
echo ============================================================
echo   ✅ SUCCESS! All services launched and connected:
echo   • Web App:     http://localhost:3000  (LAN: http://10.43.177.184:3000)
echo   • Backend API: http://localhost:8000  (Docs: http://localhost:8000/docs)
echo   • Mobile App:  Expo Go (Scan QR code in Mobile window or open exp://10.43.177.184:8081)
echo ============================================================
pause
