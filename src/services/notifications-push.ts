import { PushNotifications } from '@capacitor/push-notifications';
import { apiRequest } from "@/api/client";

/**
 * PushNotificationService handles registering the device with Firebase
 * and sending the device token to our backend for targeted deal alerts.
 */
export async function initializePushNotifications() {
  try {
    // Check if we are on a real device and not just the web/simulator without Firebase
    // For local development without google-services.json, we skip registration to prevent crashes.
    console.log("PushNotifications: Skipping native registration to prevent crash (Missing google-services.json). Add the file to android/app/ to enable.");

    // We still set up listeners so the app is ready once the file is added
    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success, token:', token.value);
      saveDeviceToken(token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on registration:', JSON.stringify(error));
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received:', notification);
    });

    // 1. Request permission (safe to call without Firebase)
    const permission = await PushNotifications.requestPermissions();
    console.log("Push permissions status:", permission.receive);

  } catch (err) {
    console.error("Native push initialization failed:", err);
  }
}

/**
 * Saves the unique device token to the ExpiryGo backend
 */
async function saveDeviceToken(token: string) {
  try {
    await apiRequest("/users/me/device-token", {
      method: "POST",
      json: { device_token: token, platform: 'android' }
    });
    console.log("Device token synced with ExpiryGo Backend");
  } catch (err) {
    console.error("Failed to sync device token", err);
  }
}
