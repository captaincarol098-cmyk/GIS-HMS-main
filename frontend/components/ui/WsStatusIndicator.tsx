/**
 * WebSocket Connection Status Indicator
 * Shows real-time connection status with visual feedback
 */

import React, { useEffect, useState } from "react";
import { Wifi, WifiOff, AlertCircle } from "lucide-react";
import { getWsStatus, onWsStatusChange } from "@/lib/ws";
import type { ConnectionStatus } from "@/lib/ws";

export function WsStatusIndicator() {
  const [status, setStatus] = useState<ConnectionStatus>(getWsStatus());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const unsubscribe = onWsStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const isConnected = status.connected;
  const isReconnecting = !isConnected && status.reconnectAttempts > 0;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isConnected
            ? "text-green-700 bg-green-50 hover:bg-green-100"
            : isReconnecting
            ? "text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
            : "text-red-700 bg-red-50 hover:bg-red-100"
        }`}
        title={isConnected ? "Connected" : isReconnecting ? "Reconnecting..." : "Disconnected"}
      >
        {isConnected && <Wifi className="w-4 h-4" />}
        {!isConnected && isReconnecting && (
          <AlertCircle className="w-4 h-4 animate-pulse" />
        )}
        {!isConnected && !isReconnecting && <WifiOff className="w-4 h-4" />}
        <span className="hidden sm:inline">
          {isConnected
            ? "Live"
            : isReconnecting
            ? `Reconnecting (${status.reconnectAttempts}/10)`
            : "Offline"}
        </span>
      </button>

      {showDetails && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
          <div className="space-y-3 text-sm">
            <div>
              <div className="font-medium text-gray-700">Connection Status</div>
              <div className={`text-xs ${isConnected ? "text-green-600" : "text-red-600"}`}>
                {isConnected ? "Connected" : "Disconnected"}
              </div>
            </div>

            {status.lastConnectedAt && (
              <div>
                <div className="font-medium text-gray-700">Last Connected</div>
                <div className="text-xs text-gray-600">
                  {status.lastConnectedAt.toLocaleTimeString()}
                </div>
              </div>
            )}

            {status.lastErrorAt && status.lastError && (
              <div>
                <div className="font-medium text-gray-700">Last Error</div>
                <div className="text-xs text-red-600 break-words">
                  {status.lastError}
                </div>
                <div className="text-xs text-gray-600">
                  {status.lastErrorAt.toLocaleTimeString()}
                </div>
              </div>
            )}

            <div>
              <div className="font-medium text-gray-700">WebSocket State</div>
              <div className="text-xs text-gray-600">
                {status.readyState === null
                  ? "Not initialized"
                  : status.readyState === WebSocket.CONNECTING
                  ? "Connecting"
                  : status.readyState === WebSocket.OPEN
                  ? "Open"
                  : status.readyState === WebSocket.CLOSING
                  ? "Closing"
                  : "Closed"}
              </div>
            </div>

            <button
              onClick={() => {
                setShowDetails(false);
                window.location.reload();
              }}
              className="w-full mt-2 px-3 py-2 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
            >
              Reconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
