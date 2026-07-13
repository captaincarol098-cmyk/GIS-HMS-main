import json
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from .config import get_settings
from .database import init_db, get_db
from .middleware.ip_whitelist import IPWhitelistMiddleware
from .middleware.rbac import get_current_user
from .services.websocket import manager
from .models import User
from .routers import alerts, auth, barangays, children, dashboard, decisions, households, imports, logs, maps, measurements, referrals, reports, users, nutrition_programs
from .routers import realtime, home_visits, messages, calendar, program_activities, accomplishments, purok_monitoring, settings as settings_router, system_notifications
from .routers import opt_plus, tam, operation_timbang, cases
from sqlalchemy.ext.asyncio import AsyncSession

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app_settings = get_settings()
app = FastAPI(title="GIS-Based Child Malnutrition Monitoring System", version="0.1.0")

logger.info("=== FastAPI Application Starting ===")
logger.info(f"Database: {app_settings.database_url}")
logger.info(f"Frontend URL: {app_settings.frontend_url}")

# Add CORS middleware - MUST be before any other middleware
# NOTE: Cannot use wildcard "*" with credentials=True
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8888",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:8888",
        "http://localhost:8000",  # Added backend itself
        "http://127.0.0.1:8000",  # Added backend itself
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],  # Be explicit
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"],
    max_age=3600,  # Cache preflight for 1 hour
)

logger.info("CORS middleware configured for origins:")
logger.info("  - http://localhost:3000, http://localhost:3001, http://localhost:8888")
logger.info("  - http://127.0.0.1:3000, http://127.0.0.1:3001, http://127.0.0.1:8888")

@app.on_event("startup")
async def startup():
    await init_db()
    logger.info("✓ Application started successfully")
    logger.info("✓ CORS middleware active for frontend origins")


@app.get("/api/health")
async def health():
    return {"status": "ok", "cors": "enabled"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time dashboard updates"""
    await manager.connect(websocket)
    try:
        while True:
            # Receive messages from client (for future bi-directional communication)
            message_text = await websocket.receive_text()
            try:
                message_data = json.loads(message_text)
                # Handle special message types
                if message_data.get("type") == "subscribe":
                    barangay_id = message_data.get("barangay_id")
                    if barangay_id:
                        await manager.subscribe_barangay(websocket, barangay_id)
                elif message_data.get("type") == "ping":
                    await manager.broadcast("pong", {}, None, "low")
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await manager.disconnect(websocket)


@app.get("/api/websocket/stats")
async def websocket_stats(user: User = Depends(get_current_user)):
    """Get WebSocket connection statistics (admin only)"""
    if user.role.value != "super_admin":
        raise HTTPException(403, "Only super_admin can view WebSocket stats")
    return manager.get_stats()


for router in [auth.router, users.router, barangays.router, children.router, measurements.router, dashboard.router, maps.router, alerts.router, referrals.router, reports.router, imports.router, logs.router, decisions.router, households.router, nutrition_programs.router, realtime.router, home_visits.router, messages.router, calendar.router, program_activities.router, accomplishments.router, purok_monitoring.router, settings_router.router, system_notifications.router, opt_plus.router, tam.router, operation_timbang.router, cases.router]:
    app.include_router(router)
