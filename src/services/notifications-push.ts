import { apiRequest } from "@/api/client";

/**
 * PushNotificationService handles registering the device token with the backend
 * and registering Web Push Service Worker.
 */
export async function initializePushNotifications() {
  if (typeof window === "undefined") return;

  // Register Web Service Worker
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("Service Worker registered with scope:", registration.scope);

      // If notification permissions are granted or can be requested
      if ("Notification" in window && Notification.permission === "granted") {
        await syncWebPushSubscription(registration);
      }
    } catch (err) {
      console.warn("ServiceWorker registration notice:", err);
    }
  }
}

export async function requestWebPushPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted" && "serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await syncWebPushSubscription(reg);
      return true;
    }
  } catch (err) {
    console.error("Error requesting push permission:", err);
  }
  return false;
}

async function syncWebPushSubscription(registration: ServiceWorkerRegistration) {
  try {
    let sub = await registration.pushManager.getSubscription();
    if (!sub) {
      // Local/demo fallback token identifier if VAPID server key is not configured
      const token = `web-sub-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      await saveDeviceToken(token);
    } else {
      await saveDeviceToken(JSON.stringify(sub));
    }
  } catch {
    // If pushManager subscription requires applicationServerKey, create a unique client token
    const clientToken = `web-client-${Math.random().toString(36).substring(2, 10)}`;
    await saveDeviceToken(clientToken);
  }
}

export async function saveDeviceToken(token: string) {
  try {
    await apiRequest("/users/me/device-token", {
      method: "POST",
      json: { device_token: token, platform: "web" },
    });
  } catch (err) {
    console.error("Failed to sync device token", err);
  }
}
