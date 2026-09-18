"use client";

import { useEffect } from "react";
import { initializePushNotifications } from "@/services/notifications-push";

/**
 * AppInitializer handles frontend initializations, service worker registration, and push notifications.
 */
export function AppInitializer() {
  useEffect(() => {
    initializePushNotifications();
  }, []);

  return null;
}
