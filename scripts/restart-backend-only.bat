@echo off
title Restart Backend - Apply Year Filter Changes
echo ========================================
echo   Restarting Backend Server
echo ========================================
echo.

echo Step 1: Stopping existing backend...
taskkill /F /IM python.exe /T 2>nul
timeout /t 2 /nobreak >nul

echo Step 2: Starting backend with new changes...
echo.
cd /d "%~dp0..\backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

pause
