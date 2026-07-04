@echo off
title GIS-HMS - Auto Start Both Backend and Frontend
color 0A
echo ============================================
echo    GIS-HMS Auto Start (Backend + Frontend)
echo ============================================
echo.

REM Kill any existing processes on ports 8000 and 3001
echo Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /F /PID %%a 2>nul
timeout /t 2 /nobreak >nul

echo.
echo ============================================
echo    Starting Backend (Port 8000)...
echo ============================================
start "GIS-HMS Backend Server" cmd /k "cd /d "%~dp0..\backend" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 5 /nobreak >nul

echo.
echo ============================================
echo    Starting Frontend (Port 3001)...
echo ============================================
start "GIS-HMS Frontend Server" cmd /k "cd /d "%~dp0..\frontend" && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo ============================================
echo    ✓ Both servers starting!
echo ============================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3001
echo API Docs: http://localhost:8000/docs
echo.
echo.
echo TIP: To stop the servers, close both windows.
echo.
pause
