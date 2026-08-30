@echo off
echo ============================================================
echo   📱 EXPIRYGO MOBILE - LAN WI-FI MODE (exp://192.168.1.7:8081)
echo ============================================================
echo.
echo Make sure your phone is connected to the same Wi-Fi network (192.168.1.x)
echo.
cd mobile
npx expo start --go --host lan -c
pause
