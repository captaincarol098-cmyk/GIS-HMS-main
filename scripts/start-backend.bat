@echo off
title GIS-HMS Backend Server
echo Starting GIS-HMS Backend Server...
echo.

cd /d "%~dp0backend"

REM Start the backend server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

pause
