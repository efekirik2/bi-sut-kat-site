@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   Bi Ust Kat - Yerel Sunucu
echo ============================================
echo.
echo   Panel:   http://localhost:8888/personel.html
echo   Masalar: http://localhost:8888/admin/masalar.html
echo.
echo   Durdurmak icin bu pencereyi kapat.
echo ============================================
echo.
node --env-file=.env dev-server.js
pause
