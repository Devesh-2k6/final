@echo off
echo ============================================================
echo   📱 EXPIRYGO - REACT NATIVE (EXPO GO) MOBILE APP LAUNCHER
echo ============================================================
echo.
echo Starting Expo Go with Tunnel Mode (Bypasses Firewall & Router Isolation)...
echo.
cd mobile
npx expo start --go --tunnel -c
pause
