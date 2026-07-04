@echo off
title GIS-HMS Frontend Server
echo Starting GIS-HMS Frontend Server...
echo.

cd /d "%~dp0frontend"

REM Start the frontend server
npm run dev

pause
