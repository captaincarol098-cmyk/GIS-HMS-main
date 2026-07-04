/**
 * React hook for managing real-time dashboard updates via WebSocket.
 * Automatically invalidates React Query caches when data changes.
 * Provides fine-grained cache invalidation to minimize unnecessary refetches.
 */

import React, { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  connectWs,
  disconnectWs,
  onWsMessage,
  onWsError,
  onWsStatusChange,
  MessageType,
  WsMessage,
  getWsStatus,
  subscribeToBarangay,
  ConnectionStatus,
} from "@/lib/ws";

/**
 * Hook to set up WebSocket connection and auto-refresh dashboard data
 * Provides intelligent cache invalidation based on message type and data
 */
export function useDashboardRealtimeUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Connect to WebSocket
    connectWs();

    // Handle measurement created/updated - affects trends, age distribution, KPIs
    const unsubMeasurement = onWsMessage(
      [MessageType.MEASUREMENT_CREATED, MessageType.MEASUREMENT_UPDATED],
      (message: WsMessage) => {
        console.log("[Dashboard] Measurement update received, refreshing data...");
        
        // Batch invalidations for better performance
        Promise.all([
          queryClient.invalidateQueries({ queryKey: ["dashboard-trend"] }),
          queryClient.invalidateQueries({ queryKey: ["dashboard-age-distribution"] }),
          queryClient.invalidateQueries({ queryKey: ["dashboard-ranking"] }),
          queryClient.invalidateQueries({ queryKey: ["summary"] }),
          queryClient.invalidateQueries({ queryKey: ["dashboard-sex-breakdown"] }),
        ]).catch(console.error);
      }
    );

    // Handle alert created/resolved - affects alerts feed and KPIs
    const unsubAlert = onWsMessage(
      [MessageType.ALERT_CREATED, MessageType.ALERT_RESOLVED],
      (message: WsMessage) => {
        console.log("[Dashboard] Alert update received, refreshing alerts...");
        
        Promise.all([
          queryClient.invalidateQueries({ queryKey: ["dashboard-alerts"] }),
          queryClient.invalidateQueries({ queryKey: ["summary"] }),
        ]).catch(console.error);
      }
    );

    // Handle barangay risk updates
    const unsubRisk = onWsMessage(
      MessageType.BARANGAY_RISK_UPDATED,
      (message: WsMessage) => {
        console.log(
          "[Dashboard] Risk update received for barangay:",
          message.barangay_id
        );
        
        Promise.all([
          queryClient.invalidateQueries({ queryKey: ["dashboard-ranking"] }),
          queryClient.invalidateQueries({ queryKey: ["summary"] }),
        ]).catch(console.error);
      }
    );

    // Handle predictions updated
    const unsubPrediction = onWsMessage(
      MessageType.PREDICTION_UPDATED,
      (message: WsMessage) => {
        console.log("[Dashboard] Prediction update received");
        
        queryClient.invalidateQueries({ queryKey: ["dashboard-predictions"] }).catch(console.error);
      }
    );

    // Handle program updates
    const unsubProgram = onWsMessage(
      [
        MessageType.PROGRAM_SESSION_CREATED,
        MessageType.PROGRAM_SESSION_UPDATED,
      ],
      (message: WsMessage) => {
        console.log("[Dashboard] Program update received");
        
        Promise.all([
          queryClient.invalidateQueries({ queryKey: ["summary"] }),
          queryClient.invalidateQueries({ queryKey: ["dashboard-intervention-effectiveness"] }),
        ]).catch(console.error);
      }
    );

    // Handle WebSocket errors
    const unsubError = onWsError((error) => {
      console.error("[Dashboard] WebSocket error:", error);
      // Could show error toast here if needed
    });

    // Log connection status
    const status = getWsStatus();
    console.log("[Dashboard] WebSocket status:", status);

    // Cleanup on unmount
    return () => {
      unsubMeasurement();
      unsubAlert();
      unsubRisk();
      unsubPrediction();
      unsubProgram();
      unsubError();
      // Don't disconnect here - keep connection alive across page navigation
      // disconnectWs();
    };
  }, [queryClient]);

  return getWsStatus();
}

/**
 * Hook to subscribe to specific WebSocket message types
 * More flexible than useDashboardRealtimeUpdates for custom use cases
 */
export function useWsSubscription(
  messageTypes: MessageType | MessageType[] | string | string[],
  callback: (message: WsMessage) => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const types = Array.isArray(messageTypes) ? messageTypes : [messageTypes];
    const unsubscribers = types.map((type) => onWsMessage(type, callback));

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [messageTypes, callback, enabled]);
}

/**
 * Hook to monitor WebSocket connection status
 * Useful for showing connection indicators in UI
 */
export function useWsConnectionStatus() {
  const [status, setStatus] = React.useState<ConnectionStatus>(getWsStatus());

  useEffect(() => {
    const unsubscribe = onWsStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return status;
}

/**
 * Hook to subscribe to a specific barangay's updates
 */
export function useBarangaySubscription(barangayId: string | null) {
  useEffect(() => {
    if (!barangayId) return;
    subscribeToBarangay(barangayId);
  }, [barangayId]);
}
