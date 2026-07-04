@echo off
echo ============================================
echo   Starting GIS-HMS Complete Environment
echo ============================================
echo.

echo Starting Backend Server...
start "GIS-HMS Backend" cmd /k "cd /d %~dp0 & start-backend.bat"

timeout /t 3 /nobreak >nul

echo Starting Frontend Server...
start "GIS-HMS Frontend" cmd /k "cd /d %~dp0\frontend & npm run dev"

timeout /t 2 /nobreak >nul

echo.
echo ============================================
echo   Services Starting...
echo ============================================
echo.
echo Backend will be available at: http://localhost:8000
echo Frontend will be available at: http://localhost:3000
echo.
echo Wait 10-15 seconds for services to fully start
echo Then open: http://localhost:3000/analytics
echo.
echo Login as super_admin to access City-Wide AI Insights
echo.
echo Press any key to check setup status...
pause >nul

call check-setup.bat
