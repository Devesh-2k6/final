import { PushNotifications } from '@capacitor/push-notifications';
import { apiRequest } from "@/api/client";

/**
 * PushNotificationService handles registering the device with Firebase
 * and sending the device token to our backend for targeted deal alerts.
 */
export async function initializePushNotifications() {
  // 1. Request permission to use push notifications
  const permission = await PushNotifications.requestPermissions();

  if (permission.receive === 'granted') {
    // 2. Register with Apple / Google to receive tokens
    await PushNotifications.register();
  }

  // 3. Listen for successful registration and get the token
  PushNotifications.addListener('registration', (token) => {
    console.log('Push registration success, token:', token.value);
    // Send this token to your backend to save it for the current user
    saveDeviceToken(token.value);
  });

  // 4. Handle errors during registration
  PushNotifications.addListener('registrationError', (error) => {
    console.error('Error on registration:', JSON.stringify(error));
  });

  // 5. Handle incoming notifications while app is open
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received:', notification);
  });
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
