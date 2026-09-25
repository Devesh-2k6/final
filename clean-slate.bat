@echo off
echo ============================================================
echo   🧹 EXPIRYGO - CLEAN SLATE INITIALIZER (ZERO DEMO PRODUCTS)
echo ============================================================
echo.
echo Wiping all demo products and preparing clean real-world environment...
cd backend
python setup_production_admin.py
cd ..
echo.
echo Database is clean with 0 demo products and 0 demo accounts. Ready for production!
pause
