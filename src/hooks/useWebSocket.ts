import { useEffect, useState, useRef } from "react";
import type { ApiProduct } from "@/types/product";

function getWebSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/^http/, "ws");
  }
  if (typeof window !== "undefined") {
    const isHttps = window.location.protocol === "https:";
    const host = window.location.hostname;
    // Default to port 8000 on localhost if on dev
    const port = host === "localhost" || host === "127.0.0.1" ? ":8000" : (window.location.port ? `:${window.location.port}` : "");
    return `${isHttps ? "wss:" : "ws:"}//${host}${port}`;
  }
  return "ws://localhost:8000";
}

type WSMessage = {
  type: string;
  product?: ApiProduct;
};

export function useWebSocket() {
  const [lastDeal, setLastDeal] = useState<ApiProduct | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempt = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isUnmounted = false;

    const connect = () => {
      if (isUnmounted) return;
      try {
        const wsBase = getWebSocketUrl();
        ws = new WebSocket(`${wsBase}/ws/notifications`);

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
          } catch (e) {
            console.error("Failed to parse WS message", e);
          }
        };

        ws.onclose = () => {
          if (isUnmounted) return;
          setIsConnected(false);
          // Exponential backoff reconnect
          const delay = Math.min(16000, 2000 * Math.pow(1.5, reconnectAttempt.current));
          reconnectAttempt.current += 1;
          reconnectTimeout = setTimeout(connect, delay);
        };

        ws.onerror = () => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        };
      } catch (e) {
        if (!isUnmounted) {
          setIsConnected(false);
          const delay = Math.min(16000, 2000 * Math.pow(1.5, reconnectAttempt.current));
          reconnectAttempt.current += 1;
          reconnectTimeout = setTimeout(connect, delay);
        }
      }
    };

    connect();

    return () => {
      isUnmounted = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      }
    };
  }, []);

  return { lastDeal, isConnected };
}
