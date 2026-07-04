# Start backend and frontend servers

Write-Host "Starting GIS-HMS Development Servers..." -ForegroundColor Cyan

# Start backend
Write-Host "Starting backend on port 8000..." -ForegroundColor Yellow
Start-Process -NoNewWindow -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd c:\xampp\htdocs\GIS-HMS-main\backend; ..\.venv\Scripts\python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start frontend
Write-Host "Starting frontend on port 3000..." -ForegroundColor Yellow
Start-Process -NoNewWindow -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd c:\xampp\htdocs\GIS-HMS-main\frontend; npm run dev"

Write-Host "`nBoth servers should be starting..." -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "Backend: http://localhost:8000" -ForegroundColor Green
Write-Host "`nClose this window when done or press Ctrl+C in each server window to stop" -ForegroundColor Green
