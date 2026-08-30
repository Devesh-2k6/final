import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

export const API_OVERRIDE_KEY = "EXPIRYGO_MOBILE_API_OVERRIDE";

export const CURRENT_LAN_IP = "192.168.1.7";
export const LAN_API_URL = `http://${CURRENT_LAN_IP}:8000`;
export const TUNNEL_API_URL = "https://good-queens-tap.loca.lt";

/**
 * Returns the default API URL depending on the platform:
 * - Real Device / Expo Go: Auto-resolves machine IP or defaults to local Wi-Fi IP (10.189.164.184:8000)
 * - Android Emulator: 10.0.2.2:8000
 * - iOS Simulator / Local: localhost:8000
 */
export function getDefaultApiBaseUrl(): string {
  // 1. Try extracting host IP from various Expo Constants locations across SDK versions
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).expoGoConfig?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri && typeof hostUri === "string") {
    const hostIp = hostUri.split(":")[0];
    if (hostIp && hostIp !== "localhost" && hostIp !== "127.0.0.1" && !hostIp.includes("exp.direct")) {
      return `http://${hostIp}:8000`;
    }
  }

  // 2. Try parsing from linkingUri (e.g., "exp://10.189.164.184:8081" or "http://10.189.164.184:8081")
  if (Constants.linkingUri && typeof Constants.linkingUri === "string") {
    try {
      const match = Constants.linkingUri.match(/^[a-zA-Z]+:\/\/([^:/]+)/);
      if (match && match[1] && match[1] !== "localhost" && match[1] !== "127.0.0.1" && !match[1].includes("exp.direct")) {
        return `http://${match[1]}:8000`;
      }
    } catch {}
  }

  // 3. For physical mobile devices on Expo Go / Wi-Fi: use laptop Wi-Fi IP
  if (Platform.OS === "android" || Platform.OS === "ios") {
    return LAN_API_URL;
  }

  return "http://localhost:8000";
}

let cachedBaseUrl: string | null = null;

export async function getApiBaseUrl(): Promise<string> {
  try {
    const override = await AsyncStorage.getItem(API_OVERRIDE_KEY);
    if (override && override.trim()) {
      const clean = override.trim().replace(/\/+$/, "");
      // Invalidate stale IPs from older test sessions
      if (clean.includes("10.221.") || clean.includes("onrender.com")) {
        await AsyncStorage.removeItem(API_OVERRIDE_KEY);
      } else {
        return clean;
      }
    }
  } catch {
    // fallback
  }
  return getDefaultApiBaseUrl();
}

export async function setApiBaseUrl(url: string): Promise<void> {
  const formatted = url.trim().replace(/\/+$/, "");
  await AsyncStorage.setItem(API_OVERRIDE_KEY, formatted);
  cachedBaseUrl = formatted;
}

export async function resetApiBaseUrl(): Promise<void> {
  await AsyncStorage.removeItem(API_OVERRIDE_KEY);
  cachedBaseUrl = null;
}

/**
 * Tests connectivity to a given API base URL
 */
export async function testApiConnection(
  targetUrl?: string
): Promise<{ success: boolean; message: string; latencyMs?: number }> {
  const url = targetUrl ? targetUrl.trim().replace(/\/+$/, "") : await getApiBaseUrl();
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(`${url}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;
    if (res.ok) {
      return { success: true, message: `Connected (${latencyMs}ms)`, latencyMs };
    }
    return { success: false, message: `Server responded with status ${res.status}` };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      return { success: false, message: "Connection timed out (4s)" };
    }
    return { success: false, message: err.message || "Failed to reach server" };
  }
}

