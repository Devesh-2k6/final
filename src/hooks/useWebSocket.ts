import { useEffect, useState, useRef } from "react";
import type { ApiProduct } from "@/types/product";
import { getPublicApiBaseUrl } from "@/config/env";

function getWebSocketUrl(): string {
  try {
    const httpUrl = getPublicApiBaseUrl();
    if (!httpUrl || httpUrl.trim() === "") {
      if (typeof window !== "undefined" && window.location && window.location.host) {
        const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
        return `${proto}//${window.location.host}`;
      }
      return "ws://localhost:8000";
    }
    return httpUrl.replace(/^https:\/\//i, "wss://").replace(/^http:\/\//i, "ws://");
  } catch {
    return "ws://localhost:8000";
  }
}

export type WSMessage = {
  type: string;
  product?: ApiProduct;
  product_id?: string;
};

export function useWebSocket(onMessage?: (msg: WSMessage) => void) {
  const [lastDeal, setLastDeal] = useState<ApiProduct | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempt = useRef(0);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (typeof window === "undefined") return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let isUnmounted = false;

    // Heartbeat fallback ensures real-time sync even when WebSocket is closed or on serverless
    pollInterval = setInterval(() => {
      if (!isUnmounted && onMessageRef.current) {
        try {
          onMessageRef.current({ type: "heartbeat_sync" });
        } catch {}
      }
    }, 3500);

    const connect = () => {
      if (isUnmounted) return;
      try {
        const wsBase = getWebSocketUrl();
        if (!wsBase || (!wsBase.startsWith("ws://") && !wsBase.startsWith("wss://"))) {
          return;
        }
        const fullUrl = `${wsBase}/ws/notifications`;
        ws = new WebSocket(fullUrl);

        ws.onopen = () => {
          if (!isUnmounted) {
            setIsConnected(true);
            reconnectAttempt.current = 0;
          }
        };

        ws.onmessage = (event) => {
          try {
            const data: WSMessage = JSON.parse(event.data);
            if (data.type === "new_deal" && data.product) {
              setLastDeal(data.product);
            }
            onMessageRef.current?.(data);
          } catch {
            // Silently ignore non-JSON messages
          }
        };

        ws.onclose = () => {
          if (isUnmounted) return;
          setIsConnected(false);
          // Exponential backoff reconnect
          const delay = Math.min(20000, 3000 * Math.pow(1.5, reconnectAttempt.current));
          reconnectAttempt.current += 1;
          reconnectTimeout = setTimeout(connect, delay);
        };

        ws.onerror = () => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            try {
              ws.close();
            } catch {}
          }
        };
      } catch {
        if (!isUnmounted) {
          setIsConnected(false);
          const delay = Math.min(20000, 3000 * Math.pow(1.5, reconnectAttempt.current));
          reconnectAttempt.current += 1;
          reconnectTimeout = setTimeout(connect, delay);
        }
      }
    };

    connect();

    return () => {
      isUnmounted = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (pollInterval) clearInterval(pollInterval);
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        try {
          ws.close();
        } catch {}
      }
    };
  }, []);

  return { lastDeal, isConnected };
}
