@echo off
title GIS-HMS System Launcher
echo ============================================
echo    GIS-HMS Auto Startup
echo    Health Monitoring System for Child
echo    Malnutrition Cases
echo ============================================
echo.
echo Starting Backend and Frontend Servers...
echo.

REM Start backend in a new window
start "GIS-HMS Backend" cmd /k "cd /d "%~dp0backend" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

REM Wait 5 seconds for backend to initialize
timeout /t 5 /nobreak

REM Start frontend in a new window
start "GIS-HMS Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ============================================
echo Both servers are starting...
echo.
echo Backend will be available at: http://localhost:8000
echo Frontend will be available at: http://localhost:3000
echo ============================================
echo.
echo You can close this window now.
echo.
timeout /t 3

exit
