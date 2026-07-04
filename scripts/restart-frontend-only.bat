@echo off
title Restart Frontend - Apply API URL Fix
color 0B
echo ============================================
echo    Restarting Frontend with Correct API URL
echo ============================================
echo.

echo Step 1: Stopping frontend...
taskkill /F /IM node.exe /T 2>nul
timeout /t 2 /nobreak >nul

echo Step 2: Killing processes on port 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
    echo   Killing PID: %%a
    taskkill /F /PID %%a 2>nul
)
timeout /t 2 /nobreak >nul

echo Step 3: Starting frontend with NEW API URL...
echo   API URL: http://localhost:8000
echo.
cd /d "%~dp0..\frontend"

npm run dev

pause
