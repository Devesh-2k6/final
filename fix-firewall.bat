@echo off
title ExpiryGo Windows Firewall Unblocker
echo ============================================================
echo   🛡️ EXPIRYGO - WINDOWS FIREWALL PERMISSIONS UNBLOCKER
echo ============================================================
echo.
echo Requesting Administrator permission to allow Expo Go (Port 8081),
echo Backend API (Port 8000), and Web (Port 3000) through Windows Firewall...
echo.
powershell -Command "Start-Process cmd -ArgumentList '/c echo Allowing ports 8081, 8000, 3000 through Windows Firewall... & netsh advfirewall firewall add rule name=\"Expo Metro 8081\" dir=in action=allow protocol=TCP localport=8081 & netsh advfirewall firewall add rule name=\"ExpiryGo API 8000\" dir=in action=allow protocol=TCP localport=8000 & netsh advfirewall firewall add rule name=\"ExpiryGo Web 3000\" dir=in action=allow protocol=TCP localport=3000 & echo [OK] Ports 8081, 8000, 3000 successfully allowed! & pause' -Verb RunAs"
echo Done! Please click 'Yes' on the Windows Administrator prompt if it appeared.
echo.
pause
