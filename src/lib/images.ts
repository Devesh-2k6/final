/**
 * Safely validates an image URL against allowed remote patterns in next.config.ts.
 * If the hostname is not configured, it returns a fallback placeholder URL.
 */
export function getSafeImageUrl(url: string | null | undefined): string {
  const inlineSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 24 24" fill="none" stroke="%23d66b1f" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="background-color:%23faf5e7"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 8h.01"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;

  if (!url) return inlineSvg;

  let safeUrl = url;
  if (url.includes("via.placeholder.com")) {
    safeUrl = url.replace("via.placeholder.com", "placehold.co");
  }

  try {
    const parsed = new URL(safeUrl);
    const hostname = parsed.hostname.toLowerCase();

    const isAllowed =
      hostname === "images.unsplash.com" ||
      hostname === "placehold.co" ||
      hostname === "example.com" ||
      hostname === "supabase.co" ||
      hostname.endsWith(".supabase.co");

    if (isAllowed) {
      return safeUrl;
    }
  } catch {
    if (safeUrl.startsWith("/") || safeUrl.startsWith("data:")) {
      return safeUrl;
    }
  }

  return inlineSvg;
}
