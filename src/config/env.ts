/**
 * Public environment values available in the browser.
 * Server-only secrets must not use the NEXT_PUBLIC_ prefix.
 */

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Base URL for the FastAPI backend (e.g. https://api.example.com).
 * Uses NEXT_PUBLIC_API_URL environment variable.
 */
export const DEFAULT_LIVE_API_URL = "http://localhost:8000";

export function getPublicApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const override = localStorage.getItem("EXPIRYGO_API_OVERRIDE");
    if (override && override.trim() && !override.includes("onrender.com") && !override.includes("loca.lt")) {
      return stripTrailingSlash(override);
    }

    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8000";
    }
    // If accessing via local Wi-Fi / LAN IP (e.g. 10.x.x.x or 192.168.x.x)
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname)) {
      return `http://${hostname}:8000`;
    }
  }

  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw && !raw.includes("onrender.com") && !raw.includes("loca.lt")) {
    return stripTrailingSlash(raw);
  }

  return "http://localhost:8000";
}
