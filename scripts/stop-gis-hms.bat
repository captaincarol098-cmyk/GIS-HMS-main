@echo off
title Stop GIS-HMS System
echo ============================================
echo    Stopping GIS-HMS System
echo ============================================
echo.

REM Kill all Python processes (backend)
echo Stopping Backend Server...
taskkill /F /IM python.exe /T 2>nul

REM Kill all Node processes (frontend)
echo Stopping Frontend Server...
taskkill /F /IM node.exe /T 2>nul

echo.
echo ============================================
echo GIS-HMS System stopped successfully!
echo ============================================
echo.
timeout /t 3
