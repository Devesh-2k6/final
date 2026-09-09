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
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${normalizedPath}`;

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

    return parsedBody as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) {
      throw err;
    }
    const errorMsg = err.name === 'AbortError' 
      ? "Server request timed out. Please try again."
      : (err.message || "Network request failed");
    throw new ApiError(503, null, errorMsg);
  }
}
