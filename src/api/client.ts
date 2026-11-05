import { getPublicApiBaseUrl } from "@/config/env";
import { getAuthToken } from "@/lib/auth-storage";

import { ApiError, parseApiErrorMessage } from "./errors";

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  json?: unknown;
  body?: BodyInit;
  /** Skip Authorization header (login/register) */
  skipAuth?: boolean;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { json: jsonBody, body: explicitBody, headers: initHeaders, skipAuth, ...rest } = options;

  const base = getPublicApiBaseUrl();
  let normalizedPath = path.startsWith("/") ? path : `/${path}`;
  // Strip trailing slashes to prevent Vercel 308 Permanent Redirects on POST/PUT
  if (normalizedPath.length > 1 && normalizedPath.endsWith("/")) {
    normalizedPath = normalizedPath.replace(/\/+$/, "");
  }
  const url = base ? `${base}${normalizedPath}` : normalizedPath;

  const headers = new Headers(initHeaders);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  // Bypass tunnel security interstitial screen
  headers.set("Bypass-Tunnel-Reminder", "true");
  headers.set("ngrok-skip-browser-warning", "true");

  if (!skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let body: BodyInit | undefined = explicitBody;
  if (jsonBody !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(jsonBody);
  }

  // Setup timeout to prevent indefinite hanging
  const controller = new AbortController();
  const timeoutMs = options.method === "POST" || options.method === "PUT" ? 25000 : 20000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...rest, headers, body, signal: controller.signal });
    clearTimeout(timeoutId);

    const contentType = res.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const parsedBody = isJson ? await res.json().catch(() => null) : await res.text();

    if (!res.ok) {
      const message = parseApiErrorMessage(res.status, parsedBody);
      throw new ApiError(res.status, parsedBody, message);
    }

    if (!isJson && typeof parsedBody === "string" && (parsedBody.trim().startsWith("<!DOCTYPE") || parsedBody.trim().startsWith("<html"))) {
      throw new ApiError(404, null, "Endpoint returned HTML page instead of API response.");
    }

    return parsedBody as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) {
      throw err;
    }
    let errorMsg = err.message || "Network request failed";
    if (err.name === "AbortError") {
      errorMsg = "Server request timed out. Please try again.";
    } else if (err.message === "Failed to fetch" || err.name === "TypeError") {
      errorMsg = base
        ? `Cannot reach backend API at ${base}. Please verify your server is running.`
        : "Failed to connect to server. Please check your internet connection.";
    }
    throw new ApiError(503, null, errorMsg);
  }
}
