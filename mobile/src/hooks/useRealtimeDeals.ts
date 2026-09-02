import { useEffect, useRef } from "react";
import { getWebSocketUrl } from "../config/env";
import type { ApiProduct } from "../types";

export type RealtimeDealsOptions = {
  onNewDeal?: (product: ApiProduct) => void;
  onUpdateDeal?: (product: ApiProduct) => void;
  onDeleteDeal?: (productId: string) => void;
  onRefreshNeeded?: () => void;
};

export function useRealtimeDeals(options: RealtimeDealsOptions = {}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let isMounted = true;
    let retryCount = 0;

    async function connect() {
      if (!isMounted) return;

      try {
        const wsBase = await getWebSocketUrl();
        const url = `${wsBase}/ws/notifications`;
        ws = new WebSocket(url);

        ws.onopen = () => {
          if (!isMounted) return;
          retryCount = 0;
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === "new_deal" && data.product) {
              optionsRef.current.onNewDeal?.(data.product);
              optionsRef.current.onRefreshNeeded?.();
            } else if (data.type === "update_deal" && data.product) {
              optionsRef.current.onUpdateDeal?.(data.product);
              optionsRef.current.onRefreshNeeded?.();
            } else if (data.type === "delete_deal" && data.product_id) {
              optionsRef.current.onDeleteDeal?.(data.product_id);
              optionsRef.current.onRefreshNeeded?.();
            }
          } catch (err) {
            console.log("WebSocket parse notice:", err);
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          const delay = Math.min(10000, 2000 * Math.pow(1.5, retryCount));
          retryCount += 1;
          reconnectTimeout = setTimeout(connect, delay);
        };

        ws.onerror = () => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        };
      } catch (err) {
        if (!isMounted) return;
        const delay = Math.min(10000, 2000 * Math.pow(1.5, retryCount));
        retryCount += 1;
        reconnectTimeout = setTimeout(connect, delay);
      }
    }

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      }
    };
  }, []);
}
