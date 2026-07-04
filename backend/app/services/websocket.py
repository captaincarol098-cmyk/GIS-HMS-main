from fastapi import WebSocket
from typing import List, Optional, Dict, Set
import json
import logging
from datetime import datetime
from asyncio import Lock

logger = logging.getLogger(__name__)

class WsMessage:
    """WebSocket message structure with metadata"""
    def __init__(self, message_type: str, data: dict = None, barangay_id: str = None, priority: str = "normal"):
        self.type = message_type
        self.data = data or {}
        self.timestamp = datetime.utcnow().isoformat() + "Z"
        self.barangay_id = barangay_id
        self.priority = priority  # "high", "normal", "low" - affects batching
    
    def to_json(self):
        return json.dumps({
            "type": self.type,
            "data": self.data,
            "timestamp": self.timestamp,
            "barangay_id": self.barangay_id,
            "priority": self.priority
        })

class ClientContext:
    """Represents a connected client with metadata"""
    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.connected_at = datetime.utcnow()
        self.user_id: Optional[str] = None
        self.barangay_id: Optional[str] = None
        self.subscribed_barangays: Set[str] = set()
    
    async def send(self, message: WsMessage):
        """Send message to this client with filtering"""
        try:
            await self.websocket.send_text(message.to_json())
        except Exception as e:
            logger.error(f"Error sending to client: {e}")
            raise

class ConnectionManager:
    """Enhanced WebSocket connection manager with client context and batching"""
    
    def __init__(self):
        self.active_connections: Dict[WebSocket, ClientContext] = {}
        self.connection_lock = Lock()
        self.message_queue: List[WsMessage] = []
        self.stats = {
            "total_connected": 0,
            "total_messages_sent": 0,
            "total_messages_broadcast": 0,
            "errors": 0
        }

    async def connect(self, websocket: WebSocket):
        """Register a new WebSocket connection"""
        await websocket.accept()
        async with self.connection_lock:
            client = ClientContext(websocket)
            self.active_connections[websocket] = client
            self.stats["total_connected"] += 1
            logger.info(f"WebSocket client connected. Total connections: {len(self.active_connections)}")
            
            # Send welcome message
            welcome = WsMessage("connection_established", {
                "message": "Connected to HMS real-time updates",
                "connected_clients": len(self.active_connections)
            })
            await client.send(welcome)

    async def disconnect(self, websocket: WebSocket):
        """Unregister a WebSocket connection"""
        async with self.connection_lock:
            if websocket in self.active_connections:
                del self.active_connections[websocket]
                logger.info(f"WebSocket client disconnected. Total connections: {len(self.active_connections)}")

    async def set_client_context(self, websocket: WebSocket, user_id: str, barangay_id: str):
        """Set user context for a client"""
        async with self.connection_lock:
            if websocket in self.active_connections:
                self.active_connections[websocket].user_id = user_id
                self.active_connections[websocket].barangay_id = barangay_id
                self.active_connections[websocket].subscribed_barangays.add(barangay_id)
                logger.debug(f"Client context set: user={user_id}, barangay={barangay_id}")

    async def subscribe_barangay(self, websocket: WebSocket, barangay_id: str):
        """Subscribe a client to barangay-specific updates"""
        async with self.connection_lock:
            if websocket in self.active_connections:
                self.active_connections[websocket].subscribed_barangays.add(barangay_id)

    async def broadcast(self, message_type: str, data: dict = None, barangay_id: str = None, priority: str = "normal"):
        """Broadcast a structured message to all connected clients"""
        message = WsMessage(message_type, data or {}, barangay_id, priority)
        logger.info(f"Broadcasting {message_type} to {len(self.active_connections)} clients (priority: {priority})")
        
        # Send immediately for high-priority messages, otherwise batch
        if priority == "high":
            await self._broadcast_message(message)
        else:
            self.message_queue.append(message)
            if len(self.message_queue) >= 10 or priority == "normal":  # Batch every 10 messages or immediately for normal
                await self._flush_queue()

    async def _broadcast_message(self, message: WsMessage):
        """Send a single message to all connected clients"""
        disconnected = []
        
        async with self.connection_lock:
            for websocket, client in list(self.active_connections.items()):
                try:
                    # Check if client is subscribed to this barangay
                    if message.barangay_id and message.barangay_id not in client.subscribed_barangays:
                        if client.barangay_id != message.barangay_id:
                            continue  # Skip clients not interested in this barangay
                    
                    await client.send(message)
                    self.stats["total_messages_sent"] += 1
                except Exception as e:
                    logger.error(f"Error broadcasting to client: {e}")
                    disconnected.append(websocket)
                    self.stats["errors"] += 1
        
        # Clean up disconnected clients
        for ws in disconnected:
            await self.disconnect(ws)
        
        self.stats["total_messages_broadcast"] += 1

    async def _flush_queue(self):
        """Flush all queued messages"""
        while self.message_queue:
            message = self.message_queue.pop(0)
            await self._broadcast_message(message)

    async def broadcast_json(self, json_message: str):
        """Broadcast raw JSON message to all connected clients"""
        logger.info(f"Broadcasting raw message to {len(self.active_connections)} clients")
        
        disconnected = []
        async with self.connection_lock:
            for websocket in list(self.active_connections.keys()):
                try:
                    await websocket.send_text(json_message)
                    self.stats["total_messages_sent"] += 1
                except Exception as e:
                    logger.error(f"Error broadcasting to websocket: {e}")
                    disconnected.append(websocket)
                    self.stats["errors"] += 1
        
        for ws in disconnected:
            await self.disconnect(ws)

    def get_stats(self) -> dict:
        """Get connection manager statistics"""
        return {
            "active_connections": len(self.active_connections),
            "queued_messages": len(self.message_queue),
            **self.stats
        }

manager = ConnectionManager()
