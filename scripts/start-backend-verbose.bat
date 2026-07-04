@echo off
title GIS-HMS Backend - Verbose Mode
color 0A
echo ============================================
echo    Starting Backend with Error Details
echo ============================================
echo.

cd /d "%~dp0..\backend"

echo Checking Python...
python --version
echo.

echo Checking if port 8000 is free...
netstat -ano | findstr ":8000"
if %errorlevel% equ 0 (
    echo WARNING: Port 8000 is already in use!
    echo Killing process on port 8000...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000"') do taskkill /F /PID %%a 2>nul
    timeout /t 2 /nobreak >nul
)

echo.
echo Starting backend server...
echo Database: Check .env file
echo.
echo ============================================
echo If you see errors below, press Ctrl+C and
echo check the error message carefully
echo ============================================
echo.

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

pause
