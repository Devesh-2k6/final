import { Platform } from "react-native";
import Constants from "expo-constants";
import { apiRequest } from "../api/client";
import type { ApiNotification } from "../types";

// Determine if running inside Expo Go (where remote notifications are disabled in SDK 53+)
const isExpoGo = Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient";

let Notifications: any = null;
try {
  if (!isExpoGo) {
    Notifications = require("expo-notifications");
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch {
  // Expo Go or unsupported environment fallback
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (isExpoGo || !Notifications) {
    return null;
  }

  let token: string | null = null;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    if (projectId) {
      const expoTokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      token = expoTokenData.data;
      if (token) {
        await saveDeviceToken(token);
      }
    }
  } catch (err) {
    // Graceful fallback for simulator / unconfigured environment
  }

  return token;
}

export async function sendLocalFoodRescueAlert(title: string, body: string) {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null, // show immediately
    });
  } catch (err) {
    // Graceful fallback
  }
}

export async function saveDeviceToken(token: string) {
  try {
    await apiRequest("/users/me/device-token", {
      method: "POST",
      json: {
        device_token: token,
        platform: Platform.OS === "ios" ? "ios" : "android",
      },
    });
    console.log("Mobile device token registered with ExpiryGo backend");
  } catch (err) {
    console.log("Could not sync push token with backend", err);
  }
}

export async function getNotifications(): Promise<ApiNotification[]> {
  return apiRequest<ApiNotification[]>("/notifications/");
}

// Backend only supports marking ALL of the current user's notifications as read
// (POST /notifications/read); there is no per-notification endpoint.
export async function markAllNotificationsAsRead(): Promise<void> {
  await apiRequest("/notifications/read", { method: "POST" });
}
