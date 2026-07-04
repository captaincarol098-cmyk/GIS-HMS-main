@echo off
echo ========================================
echo   GIS-HMS Service Restart
echo ========================================
echo.
echo This will restart both backend and frontend services.
echo Press CTRL+C to cancel, or
pause

echo.
echo [1/2] Stopping services...
powershell -Command "Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
powershell -Command "Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
timeout /t 3 >nul

echo.
echo [2/2] Starting services...
echo.
echo Starting backend...
start "Backend Server" /MIN cmd /c "cd backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
timeout /t 5 >nul

echo Starting frontend...
start "Frontend Server" /MIN cmd /c "cd frontend && npm run dev"
timeout /t 3 >nul

echo.
echo ========================================
echo   Services Started!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3001
echo Login:    http://localhost:3001/login
echo.
echo Credentials:
echo   Username: superadmin
echo   Password: Admin@123
echo.
echo Please wait 30 seconds for services to fully start,
echo then open your browser to: http://localhost:3001/login
echo.
echo IMPORTANT: Clear your browser cache (F12 ^> Application ^> Clear Storage)
echo.
pause
