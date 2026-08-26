import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiBaseUrl } from "../config/env";

export const AUTH_TOKEN_KEY = "expirygo_auth_token";
export const USER_KEY = "expirygo_user_data";
export const ROLE_INTENT_KEY = "expirygo_role_intent";

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function parseApiErrorMessage(status: number, body: unknown): string {
  if (typeof body === "object" && body !== null) {
    const b = body as Record<string, unknown>;
    if (typeof b.detail === "string") return b.detail;
    if (Array.isArray(b.detail)) {
      return b.detail.map((d: any) => d.msg || JSON.stringify(d)).join("; ");
    }
    if (typeof b.message === "string") return b.message;
  }
  if (typeof body === "string" && body.trim()) {
    return body;
  }
  return `Request failed with status ${status}`;
}

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  json?: unknown;
  body?: any;
  skipAuth?: boolean;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { json: jsonBody, body: explicitBody, headers: initHeaders, skipAuth, ...rest } = options;

  const base = await getApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${normalizedPath}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Bypass-Tunnel-Reminder": "true",
    ...((initHeaders as Record<string, string>) || {}),
  };

  if (!skipAuth) {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  let body: any = explicitBody;
  if (jsonBody !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(jsonBody);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout for mobile

  try {
    const res = await fetch(url, {
      ...rest,
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const parsedBody = isJson ? await res.json().catch(() => null) : await res.text();

    if (!res.ok) {
      if (res.status === 401 && !skipAuth) {
        await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_KEY]).catch(() => {});
      }
      const message = parseApiErrorMessage(res.status, parsedBody);
      throw new ApiError(res.status, parsedBody, message);
    }

    return parsedBody as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Server timeout. Please check your network or backend server.");
    }
    throw err;
  }
}
