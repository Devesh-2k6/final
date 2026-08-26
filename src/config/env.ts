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
export const DEFAULT_LIVE_API_URL = "https://slick-points-look.loca.lt";

export function getPublicApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const override = localStorage.getItem("EXPIRYGO_API_OVERRIDE");
    if (override) return stripTrailingSlash(override);

    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8000";
    }
  }

  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw && raw !== "https://expirygo-iokl.onrender.com" && !raw.includes("localhost")) {
    return stripTrailingSlash(raw);
  }

  // When deployed on Vercel or online, fall back to our active cloud backend tunnel
  return DEFAULT_LIVE_API_URL;
}
