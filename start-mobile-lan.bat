@echo off
echo ============================================================
echo   📱 EXPIRYGO MOBILE - LAN WI-FI MODE (exp://10.43.177.184:8081)
echo ============================================================
echo.
echo Make sure your phone is connected to the same Wi-Fi network (10.43.177.x)
echo.
cd mobile
npx expo start --go --host lan -c
pause
