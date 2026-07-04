@echo off
title FIX CORS - Complete Restart
color 0E
echo ============================================
echo    FIXING CORS ISSUE - Complete Restart
echo ============================================
echo.

echo Step 1: Killing ALL Python processes...
taskkill /F /IM python.exe /T 2>nul
timeout /t 3 /nobreak >nul

echo Step 2: Killing processes on port 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo   Killing PID: %%a
    taskkill /F /PID %%a 2>nul
)
timeout /t 2 /nobreak >nul

echo Step 3: Verifying port 8000 is free...
netstat -ano | findstr ":8000" | findstr "LISTENING"
if %errorlevel% equ 0 (
    echo   WARNING: Port still in use! Please close manually.
    pause
    exit /b 1
) else (
    echo   ✓ Port 8000 is free!
)

echo.
echo Step 4: Starting backend with NEW CORS config...
echo.
cd /d "%~dp0..\backend"

echo ============================================
echo Backend starting... Watch for errors below
echo ============================================
echo.

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

pause
