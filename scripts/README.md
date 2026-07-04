# GIS-HMS Scripts

This folder contains essential scripts to manage the GIS-HMS system.

## Essential Scripts

### 🚀 Starting the System

**`START_ALL.bat`** (Recommended)
- Starts both backend and frontend in separate windows
- Most convenient way to launch the entire system
- Opens two command windows (backend on port 8000, frontend on port 3001)

**`start-gis-hms.bat`**
- Alternative launcher for the complete system
- Similar to START_ALL.bat

**`start-backend.bat`**
- Starts only the FastAPI backend server
- Runs on http://localhost:8000
- Useful when you only need to test/work on the backend

**`start-frontend.bat`**
- Starts only the Next.js frontend
- Runs on http://localhost:3001
- Useful when you only need to test/work on the frontend

**`run.ps1`** (PowerShell)
- PowerShell version of the system launcher
- Starts both backend and frontend
- Use if you prefer PowerShell over BAT files

### 🔄 Managing Services

**`restart-services.bat`**
- Stops and restarts both backend and frontend
- Useful when you need to apply configuration changes
- Automatically kills processes on ports 8000 and 3001

**`stop-gis-hms.bat`**
- Stops all running GIS-HMS services
- Kills Python (backend) and Node (frontend) processes
- Use when you need to completely shut down the system

## Usage

### First Time Setup
1. Make sure Python virtual environment is activated
2. Install backend dependencies: `pip install -r backend/requirements.txt`
3. Install frontend dependencies: `npm install` in frontend folder
4. Run database migrations if needed

### Daily Use
1. Double-click `START_ALL.bat` to launch the system
2. Wait for both servers to start (10-15 seconds)
3. Open browser to http://localhost:3001
4. When done, run `stop-gis-hms.bat` or close the command windows

### Development
- Use `start-backend.bat` when working on backend only
- Use `start-frontend.bat` when working on frontend only
- Use `restart-services.bat` after configuration changes

## System Requirements
- Windows OS
- Python 3.9+ with virtual environment
- Node.js 18+ with npm
- MySQL/MariaDB database running
- Ports 8000 and 3001 available

## Troubleshooting

### Backend won't start
- Check if Python virtual environment is activated
- Verify database connection in `backend/.env`
- Ensure port 8000 is not in use

### Frontend won't start
- Run `npm install` in frontend folder
- Check if port 3001 is available
- Verify Node.js version is 18 or higher

### Can't stop services
- Use Task Manager to manually kill Python/Node processes
- Check for processes using ports 8000 and 3001:
  ```
  netstat -ano | findstr "8000"
  netstat -ano | findstr "3001"
  ```
