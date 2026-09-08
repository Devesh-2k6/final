/**
 * Public environment values available in the browser.
 * Server-only secrets must not use the NEXT_PUBLIC_ prefix.
 */

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Base URL for the FastAPI backend (e.g. http://localhost:8000 or https://api.yourdomain.com).
 * Automatically configured via NEXT_PUBLIC_API_URL, localStorage override, or host auto-detection.
 */
export const DEFAULT_LIVE_API_URL = "http://localhost:8000";

export function getPublicApiBaseUrl(): string {
  // 1. Check for manual local override in browser storage
  if (typeof window !== "undefined") {
    const override = localStorage.getItem("EXPIRYGO_API_OVERRIDE");
    if (override && override.trim()) {
      return stripTrailingSlash(override.trim());
    }
  }

  // 2. Check for build-time / runtime environment variable
  const rawEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (rawEnv && rawEnv !== "" && rawEnv !== "undefined") {
    return stripTrailingSlash(rawEnv);
  }

  // 3. Auto-detect based on current browser location
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8000";
    }
    // If accessing via local Wi-Fi / LAN IP (e.g. 10.x.x.x, 192.168.x.x, 172.x.x.x)
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname)) {
      return `http://${hostname}:8000`;
    }
  }

  return DEFAULT_LIVE_API_URL;
}

export function setPublicApiBaseUrl(url: string): void {
  if (typeof window !== "undefined") {
    const clean = stripTrailingSlash(url.trim());
    localStorage.setItem("EXPIRYGO_API_OVERRIDE", clean);
  }
}

export function resetPublicApiBaseUrl(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("EXPIRYGO_API_OVERRIDE");
  }
}

