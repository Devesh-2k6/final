@echo off
echo ============================================================
echo   🧹 EXPIRYGO - CLEAN SLATE INITIALIZER (ZERO DEMO PRODUCTS)
echo ============================================================
echo.
echo Wiping all demo products and preparing clean real-world environment...
cd backend
python clean_slate.py
cd ..
echo.
echo Database is clean with 0 products. Ready for real uploads!
pause
