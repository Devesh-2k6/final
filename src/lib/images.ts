import { getPublicApiBaseUrl } from "@/config/env";

/**
 * Safely validates and formats an image URL for Next.js Image components.
 * Handles local API backend uploads, cloud storage, Unsplash, and fallback placeholders.
 */
export function getSafeImageUrl(url: string | null | undefined): string {
  const inlineSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 24 24" fill="none" stroke="%2310B981" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="background-color:%23F0FDF4"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 8h.01"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;

  if (!url || typeof url !== "string" || !url.trim()) {
    return inlineSvg;
  }

  let safeUrl = url.trim();

  // If the URL is a relative backend static path (e.g. /static/uploads/...)
  if (safeUrl.startsWith("/static/")) {
    return `${getPublicApiBaseUrl()}${safeUrl}`;
  }

  // If the URL points to localhost:8000 or 127.0.0.1:8000 static uploads but user is accessing via LAN IP or configured base URL
  if (safeUrl.includes("/static/uploads/")) {
    const apiBase = getPublicApiBaseUrl();
    const uploadPath = safeUrl.substring(safeUrl.indexOf("/static/uploads/"));
    return `${apiBase}${uploadPath}`;
  }

  if (safeUrl.includes("via.placeholder.com")) {
    safeUrl = safeUrl.replace("via.placeholder.com", "placehold.co");
  }

  try {
    const parsed = new URL(safeUrl);
    const hostname = parsed.hostname.toLowerCase();

    const isAllowed =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "images.unsplash.com" ||
      hostname === "placehold.co" ||
      hostname === "example.com" ||
      hostname === "supabase.co" ||
      hostname.endsWith(".supabase.co") ||
      hostname.endsWith(".onrender.com") ||
      hostname.endsWith(".railway.app") ||
      hostname.endsWith(".up.railway.app") ||
      hostname.endsWith(".loca.lt") ||
      hostname.endsWith(".ngrok-free.app") ||
      hostname.endsWith(".ngrok.io") ||
      /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname);

    if (isAllowed) {
      return safeUrl;
    }
    // Return original URL for unoptimized images
    return safeUrl;
  } catch {
    if (safeUrl.startsWith("/") || safeUrl.startsWith("data:")) {
      return safeUrl;
    }
  }

  return inlineSvg;
}
