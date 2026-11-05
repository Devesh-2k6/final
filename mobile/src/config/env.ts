import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_OVERRIDE_KEY = "EXPIRYGO_MOBILE_API_OVERRIDE";

export const LIVE_PRODUCTION_URL = "https://expirygo.vercel.app";
export const CURRENT_LAN_IP = "192.168.1.7";
export const LAN_API_URL = `http://${CURRENT_LAN_IP}:8000`;
export const TUNNEL_API_URL = "https://expirygo.vercel.app";

/**
 * Returns the default API URL:
 * Connected directly to the live production server (https://expirygo.vercel.app)
 * ensuring Web and Mobile apps are 100% synchronized in real time.
 */
export function getDefaultApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL && process.env.EXPO_PUBLIC_API_URL.trim()) {
    return process.env.EXPO_PUBLIC_API_URL.trim().replace(/\/+$/, "");
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname.endsWith(".vercel.app") || hostname === "expirygo.vercel.app") {
      return window.location.origin;
    }
  }

  return LIVE_PRODUCTION_URL;
}

export async function getWebSocketUrl(): Promise<string> {
  const httpUrl = await getApiBaseUrl();
  return httpUrl.replace(/^https:\/\//i, "wss://").replace(/^http:\/\//i, "ws://");
}

let cachedBaseUrl: string | null = null;

export async function getApiBaseUrl(): Promise<string> {
  try {
    const override = await AsyncStorage.getItem(API_OVERRIDE_KEY);
    if (override && override.trim()) {
      const clean = override.trim().replace(/\/+$/, "");
      // Clean up stale local port 8000 or dead tunnel overrides
      if (
        clean.includes(":8000") ||
        clean.includes("192.168.") ||
        clean.includes("172.23.") ||
        clean.includes("loca.lt") ||
        clean.includes("trycloudflare.com")
      ) {
        await AsyncStorage.removeItem(API_OVERRIDE_KEY);
        cachedBaseUrl = null;
        return LIVE_PRODUCTION_URL;
      }
      return clean;
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
  const timeoutId = setTimeout(() => controller.abort(), 6000);

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
      return { success: false, message: "Connection timed out (6s)" };
    }
    return { success: false, message: err.message || "Failed to reach server" };
  }
}
