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
export function getPublicApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw) return stripTrailingSlash(raw);
  return "https://expirygo-iokl.onrender.com";
}
