/**
 * Public environment values available in the browser.
 * Server-only secrets must not use the NEXT_PUBLIC_ prefix.
 */

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export const DEFAULT_LIVE_API_URL = "";

export function getPublicApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;

    // 1. Clean up stale or invalid localStorage overrides
    try {
      const override = localStorage.getItem("EXPIRYGO_API_OVERRIDE");
      if (override && override.trim()) {
        const clean = stripTrailingSlash(override.trim());
        if (
          clean.includes("trycloudflare.com") ||
          clean.includes("loca.lt") ||
          (hostname !== "localhost" && hostname !== "127.0.0.1" && clean.includes("localhost"))
        ) {
          localStorage.removeItem("EXPIRYGO_API_OVERRIDE");
        } else {
          return clean;
        }
      }
    } catch {
      // Storage access blocked / SSR
    }

    // 2. Check explicitly configured environment variable NEXT_PUBLIC_API_URL
    const rawEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (rawEnv && rawEnv !== "" && rawEnv !== "undefined") {
      const cleanEnv = stripTrailingSlash(rawEnv);
      if (!cleanEnv.includes("trycloudflare.com") && !cleanEnv.includes("loca.lt")) {
        return cleanEnv;
      }
    }

    // 3. Unified Next.js API routes (Serverless + Local):
    // Same-origin relative endpoints ensure 100% sync across localhost, LAN, and live Vercel deployments.
    return "";
  }

  // Server-side evaluation
  const rawEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (rawEnv && rawEnv !== "" && rawEnv !== "undefined") {
    const cleanEnv = stripTrailingSlash(rawEnv);
    if (!cleanEnv.includes("trycloudflare.com") && !cleanEnv.includes("loca.lt")) {
      return cleanEnv;
    }
  }

  return "";
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

export async function testApiHealth(
  targetUrl: string
): Promise<{ success: boolean; latencyMs?: number; message: string }> {
  const clean = stripTrailingSlash(targetUrl.trim());
  const endpoint = clean ? `${clean}/health` : "/health";
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Bypass-Tunnel-Reminder": "true",
      },
    });
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;
    if (res.ok) {
      return { success: true, latencyMs, message: `Connected (${latencyMs}ms)` };
    }
    return { success: false, message: `Server replied with HTTP ${res.status}` };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      return { success: false, message: "Connection timed out (5s)" };
    }
    return { success: false, message: err.message || "Failed to reach server" };
  }
}
