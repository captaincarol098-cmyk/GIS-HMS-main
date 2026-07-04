/**
 * Enhanced WebSocket client for real-time dashboard updates.
 * Manages connections, reconnections, typed event broadcasting, and connection status.
 */

import { API_URL } from "./api";

/**
 * Message types for WebSocket communication
 */
export enum MessageType {
  // Connection management
  CONNECTION_ESTABLISHED = "connection_established",
  PING = "ping",
  PONG = "pong",
  
  // Dashboard updates
  MEASUREMENT_CREATED = "measurement_created",
  MEASUREMENT_UPDATED = "measurement_updated",
  ALERT_CREATED = "alert_created",
  ALERT_RESOLVED = "alert_resolved",
  
  // Risk scoring
  BARANGAY_RISK_UPDATED = "barangay_risk_updated",
  CHILD_RISK_UPDATED = "child_risk_updated",
  
  // Program updates
  PROGRAM_SESSION_CREATED = "program_session_created",
  PROGRAM_SESSION_UPDATED = "program_session_updated",
  
  // Predictions
  PREDICTION_UPDATED = "prediction_updated",
  
  // Activity tracking
  ACTIVITY_LOGGED = "activity_logged",
}

/**
 * WebSocket message structure
 */
export interface WsMessage {
  type: MessageType | string;
  data: any;
  timestamp: string;
  barangay_id?: string;
  priority?: "high" | "normal" | "low";
}

/**
 * Connection status
 */
export interface ConnectionStatus {
  connected: boolean;
  readyState: number | null;
  reconnectAttempts: number;
  lastConnectedAt: Date | null;
  lastErrorAt: Date | null;
  lastError: string | null;
}

type WsListener = (message: WsMessage) => void;
type ErrorListener = (error: Error) => void;
type StatusListener = (status: ConnectionStatus) => void;

const listeners: Map<MessageType | string, Set<WsListener>> = new Map();
const errorListeners: Set<ErrorListener> = new Set();
const statusListeners: Set<StatusListener> = new Set();

let socket: WebSocket | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let lastConnectedAt: Date | null = null;
let lastErrorAt: Date | null = null;
let lastError: string | null = null;

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 2000;

/**
 * Subscribe to a specific message type(s)
 */
export function onWsMessage(
  type: MessageType | string | (MessageType | string)[],
  fn: WsListener
) {
  const types = Array.isArray(type) ? type : [type];
  
  types.forEach((t) => {
    if (!listeners.has(t)) {
      listeners.set(t, new Set());
    }
    listeners.get(t)!.add(fn);
  });
  
  // Return unsubscribe function
  return () => {
    types.forEach((t) => {
      const typeListeners = listeners.get(t);
      if (typeListeners) {
        typeListeners.delete(fn);
      }
    });
  };
}

/**
 * Subscribe to WebSocket errors
 */
export function onWsError(fn: ErrorListener) {
  errorListeners.add(fn);
  return () => errorListeners.delete(fn);
}

/**
 * Subscribe to connection status changes
 */
export function onWsStatusChange(fn: StatusListener) {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

/**
 * Notify all status listeners
 */
function notifyStatusChange() {
  const status = getWsStatus();
  statusListeners.forEach((fn) => fn(status));
}

/**
 * Connect to WebSocket server
 */
export function connectWs() {
  if (typeof window === "undefined") return;
  if (socket && socket.readyState === WebSocket.OPEN) {
    console.log("[WS] Already connected");
    return;
  }

  try {
    const wsUrl = API_URL.replace(/^http/, "ws") + "/ws";
    console.log("[WS] Connecting to", wsUrl);
    
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("[WS] Connected successfully");
      reconnectAttempts = 0;
      lastConnectedAt = new Date();
      lastErrorAt = null;
      lastError = null;
      notifyStatusChange();
      
      // Send initial ping to verify connection
      sendWsMessage({
        type: MessageType.PING,
        data: { timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString(),
      });
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WsMessage;
        console.log(
          `[WS] Received: ${message.type}`,
          message.data
        );
        
        // Emit to specific type listeners
        const typeListeners = listeners.get(message.type);
        if (typeListeners) {
          typeListeners.forEach((fn) => {
            try {
              fn(message);
            } catch (err) {
              console.error(`[WS] Error in listener for ${message.type}:`, err);
            }
          });
        }
        
        // Emit to wildcard listeners
        const wildcardListeners = listeners.get("*");
        if (wildcardListeners) {
          wildcardListeners.forEach((fn) => {
            try {
              fn(message);
            } catch (err) {
              console.error("[WS] Error in wildcard listener:", err);
            }
          });
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error("[WS] Error parsing message:", err);
        lastError = err.message;
        lastErrorAt = new Date();
        errorListeners.forEach((fn) => fn(err));
      }
    };

    socket.onclose = () => {
      console.log("[WS] Connection closed, attempting reconnect...");
      notifyStatusChange();
      scheduleReconnect();
    };

    socket.onerror = (event) => {
      const error = new Error(`WebSocket error: ${event.type}`);
      console.error("[WS] Error:", error);
      lastError = error.message;
      lastErrorAt = new Date();
      notifyStatusChange();
      errorListeners.forEach((fn) => fn(error));
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[WS] Connection failed:", err);
    lastError = err.message;
    lastErrorAt = new Date();
    notifyStatusChange();
    errorListeners.forEach((fn) => fn(err));
    scheduleReconnect();
  }
}

/**
 * Schedule reconnection with exponential backoff
 */
function scheduleReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn(
      "[WS] Max reconnect attempts reached, giving up until manual retry"
    );
    return;
  }

  reconnectAttempts++;
  const delay = BASE_RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts - 1);
  console.log(
    `[WS] Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
  );
  notifyStatusChange();

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
  reconnectTimeout = setTimeout(connectWs, delay);
}

/**
 * Disconnect from WebSocket server
 */
export function disconnectWs() {
  if (socket) {
    socket.onclose = null;
    socket.close();
    socket = null;
  }
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  console.log("[WS] Disconnected");
  notifyStatusChange();
}

/**
 * Send a message through WebSocket
 */
export function sendWsMessage(message: WsMessage) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.warn("[WS] Socket not connected, cannot send message");
    return false;
  }

  try {
    socket.send(JSON.stringify(message));
    console.log("[WS] Sent:", message.type);
    return true;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[WS] Error sending message:", err);
    lastError = err.message;
    lastErrorAt = new Date();
    errorListeners.forEach((fn) => fn(err));
    return false;
  }
}

/**
 * Subscribe to a barangay's updates
 */
export function subscribeToBarangay(barangayId: string) {
  return sendWsMessage({
    type: "subscribe",
    data: { barangay_id: barangayId },
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get current connection status
 */
export function getWsStatus(): ConnectionStatus {
  return {
    connected: socket ? socket.readyState === WebSocket.OPEN : false,
    readyState: socket?.readyState ?? null,
    reconnectAttempts,
    lastConnectedAt,
    lastErrorAt,
    lastError,
  };
}

/**
 * Reset reconnection counter and attempt to connect
 */
export function reconnectWs() {
  reconnectAttempts = 0;
  connectWs();
}
