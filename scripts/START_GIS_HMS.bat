@echo off
setlocal enabledelayedexpansion
title GIS-HMS System - Starting...
color 0B

REM Get the project root directory
set PROJECT_ROOT=%~dp0..

echo.
echo ========================================================================
echo                   GIS-HMS HEALTH MONITORING SYSTEM
echo                         Auto Start Script
echo ========================================================================
echo.

REM Step 1: Kill existing processes
echo [STEP 1/4] Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8000"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3001"') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul
echo [✓] Ports cleaned
echo.

REM Step 2: Start Backend
echo [STEP 2/4] Starting Backend Server...
echo          Location: %PROJECT_ROOT%\backend
echo          Port: 8000
start "GIS-HMS Backend - Port 8000" /D "%PROJECT_ROOT%\backend" cmd /k "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 5 /nobreak >nul
echo [✓] Backend started
echo.

REM Step 3: Start Frontend
echo [STEP 3/4] Starting Frontend Server...
echo          Location: %PROJECT_ROOT%\frontend
echo          Port: 3001
start "GIS-HMS Frontend - Port 3001" /D "%PROJECT_ROOT%\frontend" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul
echo [✓] Frontend started
echo.

REM Step 4: Display URLs
echo [STEP 4/4] System Ready!
echo.
echo ========================================================================
echo                         SYSTEM READY
echo ========================================================================
echo.
echo Dashboard:     http://localhost:3001
echo Backend API:   http://localhost:8000
echo API Docs:      http://localhost:8000/docs
echo.
echo Database:      PostgreSQL (localhost:5432)
echo Environment:   Development
echo.
echo ========================================================================
echo.
echo Backend Window:  Check for [DEBUG] logs
echo Frontend Window: Check for "ready in"
echo.
echo To STOP the system:
echo   - Close the Backend window, OR
echo   - Close the Frontend window, OR
echo   - Close both windows
echo.
timeout /t 5 /nobreak >nul
cls

echo.
echo ========================================================================
echo                    GIS-HMS is now RUNNING
echo ========================================================================
echo.
echo The system has been started successfully!
echo.
echo Open your browser and navigate to:
echo    http://localhost:3001
echo.
echo Backend is running at:
echo    http://localhost:8000/api/health
echo.
echo Two new command windows have been opened:
echo    1. GIS-HMS Backend Server   (Port 8000)
echo    2. GIS-HMS Frontend Server  (Port 3001)
echo.
echo Do NOT close these windows while using the system.
echo.
pause
