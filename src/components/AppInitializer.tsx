"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { initializePushNotifications } from "@/services/notifications-push";

/**
 * AppInitializer handles cross-platform initializations
 * such as Push Notifications and Native SDKs when running on Android/iOS.
 */
export function AppInitializer() {
  useEffect(() => {
    // Only run Capacitor initializations if we are on a native platform
    if (Capacitor.isNativePlatform()) {
      console.log("ExpiryGo: Native platform detected. Initializing services...");

      // Initialize Push Notifications
      initializePushNotifications();

      // You can add other native initializations here (e.g. Geolocation, Deep Links)
    } else {
      console.log("ExpiryGo: Web platform detected. Native services skipped.");
    }
  }, []);

  return null;
}
