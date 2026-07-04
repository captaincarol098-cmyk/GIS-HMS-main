# 🚀 GIS-HMS Auto Start Scripts

## Quick Start

### Option 1: Simple Start (Recommended)
```
Double-click: START_GIS_HMS.bat
```
This will:
- ✅ Kill any existing processes on ports 8000 and 3001
- ✅ Start Backend (http://localhost:8000)
- ✅ Start Frontend (http://localhost:3001)
- ✅ Open two terminal windows for monitoring

### Option 2: Alternative Start
```
Double-click: START_ALL_AUTO.bat
```
Same as Option 1, slightly different interface

---

## What Happens

### When you run START_GIS_HMS.bat:

1. **Cleans up** - Kills any old processes
2. **Starts Backend** - FastAPI on port 8000
   - Window title: "GIS-HMS Backend - Port 8000"
   - Look for: `INFO: Application startup complete`
3. **Starts Frontend** - Next.js on port 3001
   - Window title: "GIS-HMS Frontend - Port 3001"
   - Look for: `✓ ready in`
4. **Displays URLs** - Ready to use!

---

## Accessing the System

After starting, open browser and go to:

```
http://localhost:3001
```

### Other URLs:
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/health

---

## Monitoring

### Backend Window
Look for these indicators:
- ✅ "INFO: Uvicorn running on http://0.0.0.0:8000"
- ✅ "[DEBUG]" messages when you interact with dashboard
- ❌ If you see errors in red, check `.env` configuration

### Frontend Window
Look for:
- ✅ "ready in X ms"
- ✅ "compiled client and server successfully"
- ❌ If you see errors, check `frontend/.env.local`

---

## Troubleshooting

### "Port 8000 already in use"
- Another backend is running
- Close the other backend window and try again
- Or kill the process: `taskkill /F /IM python.exe`

### "Port 3001 already in use"
- Another frontend is running
- Close the other frontend window and try again
- Or kill: `taskkill /F /IM node.exe`

### "Cannot connect to server"
- Make sure both windows show "ready" or "startup complete"
- Wait 10 more seconds for services to fully load
- Check firewall isn't blocking ports 8000 or 3001

### Data not showing (shows zeros)
- Check backend console for debug logs
- Ensure database connection is working
- Verify year filter is set to 2025

---

## Stopping the System

### Option 1: Close both windows
```
Click X on both terminal windows
```

### Option 2: Stop from command line
```
taskkill /F /IM python.exe /T
taskkill /F /IM node.exe /T
```

---

## Environment Configuration

### Backend (.env)
- Location: `backend/.env`
- Important: Database URL, API keys, etc.

### Frontend (.env.local)
- Location: `frontend/.env.local`
- Important: `NEXT_PUBLIC_API_URL=http://localhost:8000`

---

## Development Tips

### Real-time Updates
- Backend reloads on `.py` file changes (--reload flag)
- Frontend reloads on `.tsx` file changes (npm run dev)

### View Logs
- Backend logs: Terminal window "GIS-HMS Backend"
- Frontend logs: Terminal window "GIS-HMS Frontend"
- Browser console: F12 → Console tab

### API Testing
- Use Swagger UI: http://localhost:8000/docs
- Use Postman or Thunder Client
- Use curl from command line

---

## System Requirements

✓ Windows OS  
✓ Python 3.9+  
✓ Node.js 18+  
✓ PostgreSQL running  
✓ Ports 8000 and 3001 available  

---

## Next Steps

1. Run `START_GIS_HMS.bat`
2. Wait for both windows to show "ready"
3. Open `http://localhost:3001`
4. Login with SuperAdmin credentials
5. Select year "2025" from dashboard dropdown
6. Check if data appears!

---

## Questions?

If you encounter issues, check:
1. Backend console for `[DEBUG]` logs
2. Frontend console (F12) for errors
3. API health: http://localhost:8000/api/health

Good luck! 🎉
