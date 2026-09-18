import { getPublicApiBaseUrl } from "@/config/env";

/**
 * Returns a high-resolution, appetizing food image matching the product name or category.
 */
export function getSmartFallbackImage(name?: string, category?: string): string {
  const n = (name || "").toLowerCase();
  const c = (category || "").toUpperCase();

  if (n.includes("turmeric") || n.includes("spice") || n.includes("masala") || n.includes("chilli") || n.includes("powder") || n.includes("pepper")) {
    return "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=600";
  }
  if (n.includes("bread") || n.includes("croissant") || n.includes("cake") || n.includes("bun") || n.includes("cookie") || n.includes("biscuit") || c === "BAKERY") {
    return "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600";
  }
  if (n.includes("milk") || n.includes("paneer") || n.includes("curd") || n.includes("yogurt") || n.includes("cheese") || n.includes("butter") || c === "DAIRY") {
    return "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=600";
  }
  if (n.includes("apple") || n.includes("banana") || n.includes("tomato") || n.includes("onion") || n.includes("potato") || n.includes("fruit") || n.includes("veg") || c === "PRODUCE") {
    return "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=600";
  }
  if (n.includes("chicken") || n.includes("mutton") || n.includes("egg") || n.includes("fish") || n.includes("meat") || c === "MEAT") {
    return "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&q=80&w=600";
  }
  if (n.includes("rice") || n.includes("dal") || n.includes("flour") || n.includes("atta") || n.includes("oil") || c === "PANTRY") {
    return "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600";
  }
  if (c === "PREPARED_FOOD" || n.includes("meal") || n.includes("snack") || n.includes("biryani") || n.includes("curry")) {
    return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600";
  }

  return "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600";
}

/**
 * Safely validates and formats an image URL for Next.js Image components.
 * Handles local API backend uploads, cloud storage, Unsplash, and fallback placeholders.
 */
export function getSafeImageUrl(url: string | null | undefined, name?: string, category?: string): string {
  const fallback = getSmartFallbackImage(name, category);

  if (!url || typeof url !== "string" || !url.trim() || url.includes("<svg") || url.startsWith("data:image/svg")) {
    return fallback;
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
    return safeUrl;
  } catch {
    if (safeUrl.startsWith("/") || safeUrl.startsWith("data:")) {
      return safeUrl;
    }
  }

  return fallback;
}

