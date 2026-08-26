import { apiRequest } from "@/api/client";

/**
 * PushNotificationService handles registering the device token with the backend.
 */
export async function initializePushNotifications() {
  // Mobile push notifications are natively handled in the React Native app (mobile/)
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
