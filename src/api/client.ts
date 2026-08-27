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

  // Setup timeout to prevent "hanging" during login if server is asleep
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

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
    if (err.name === 'AbortError') {
      throw new Error("Server is taking too long to respond. It might be waking up or down.");
    }
    throw err;
  }
}
