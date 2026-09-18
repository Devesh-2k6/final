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
    try {
      const override = localStorage.getItem("EXPIRYGO_API_OVERRIDE");
      if (override && override.trim()) {
        return stripTrailingSlash(override.trim());
      }
    } catch {
      // Storage access blocked / SSR
    }
  }

  // 2. Check for custom non-localhost build-time / runtime environment variable
  const rawEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (
    rawEnv &&
    rawEnv !== "" &&
    rawEnv !== "undefined" &&
    !rawEnv.includes("localhost") &&
    !rawEnv.includes("127.0.0.1")
  ) {
    return stripTrailingSlash(rawEnv);
  }

  // 3. Auto-detect based on current browser location
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    const port = window.location.port;

    // Single-Port Unified Hosting (FastAPI serving Next.js on port 8000 or custom port)
    if (port === "8000") {
      return `${protocol}//${hostname}:8000`;
    }

    // Localhost Development (Next.js on 3000 -> FastAPI on 8000)
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8000";
    }

    // Local Wi-Fi / LAN IP (e.g. 192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname)) {
      if (port === "3000") {
        return `${protocol}//${hostname}:8000`;
      }
      return `${protocol}//${hostname}:8000`;
    }

    // Cloudflare Tunnel, Ngrok, Localtunnel, or Hosted Web Domain
    if (
      hostname.endsWith(".trycloudflare.com") ||
      hostname.endsWith(".loca.lt") ||
      hostname.endsWith(".ngrok-free.app") ||
      hostname.endsWith(".ngrok.io") ||
      hostname.endsWith(".vercel.app") ||
      hostname.endsWith(".railway.app") ||
      hostname.endsWith(".onrender.com")
    ) {
      // If co-hosted or routed through single tunnel/proxy, use origin
      return window.location.origin;
    }

    // Any other custom hosted domain
    if (port === "" || port === "80" || port === "443") {
      return window.location.origin;
    }
  }

  if (rawEnv && rawEnv !== "" && rawEnv !== "undefined") {
    return stripTrailingSlash(rawEnv);
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

