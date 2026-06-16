import { useEffect, useState } from "react";
import type { ApiProduct } from "@/types/product";

// Connect to backend WebSocket based on current environment API URL
const WS_URL = process.env.NEXT_PUBLIC_API_URL?.replace("http", "ws") || "wss://expirygo-iokl.onrender.com";

type WSMessage = {
  type: string;
  product?: ApiProduct;
};

export function useWebSocket() {
  const [lastDeal, setLastDeal] = useState<ApiProduct | null>(null);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      try {
        ws = new WebSocket(`${WS_URL}/ws/notifications`);
        
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
          // Attempt to reconnect after 3 seconds
          reconnectTimeout = setTimeout(connect, 3000);
        };
        
        ws.onerror = () => {
          ws.close();
        };
      } catch (e) {
        console.error("Failed to connect WS", e);
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null; // Prevent reconnect on unmount
        ws.close();
      }
    };
  }, []);

  return { lastDeal };
}
