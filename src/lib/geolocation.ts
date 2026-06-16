export interface GeolocationData {
  latitude: number;
  longitude: number;
}

export async function fetchIpGeolocation(): Promise<GeolocationData> {
  // Try ipapi.co first
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (!res.ok) throw new Error(`ipapi.co responded with ${res.status}`);
    const data = await res.json();
    if (typeof data.latitude === "number" && typeof data.longitude === "number") {
      return { latitude: data.latitude, longitude: data.longitude };
    }
    throw new Error("Invalid format from ipapi.co");
  } catch (err) {
    console.warn("ipapi.co failed, trying freeipapi.com:", err);
  }

  // Try freeipapi.com as first fallback
  try {
    const res = await fetch("https://freeipapi.com/api/json");
    if (!res.ok) throw new Error(`freeipapi.com responded with ${res.status}`);
    const data = await res.json();
    if (typeof data.latitude === "number" && typeof data.longitude === "number") {
      return { latitude: data.latitude, longitude: data.longitude };
    }
    throw new Error("Invalid format from freeipapi.com");
  } catch (err) {
    console.warn("freeipapi.com failed, trying ipinfo.io:", err);
  }

  // Try ipinfo.io as second fallback
  try {
    const res = await fetch("https://ipinfo.io/json");
    if (!res.ok) throw new Error(`ipinfo.io responded with ${res.status}`);
    const data = await res.json();
    if (data.loc) {
      const [latStr, lngStr] = data.loc.split(",");
      const latitude = parseFloat(latStr);
      const longitude = parseFloat(lngStr);
      if (!isNaN(latitude) && !isNaN(longitude)) {
        return { latitude, longitude };
      }
    }
    throw new Error("Invalid format from ipinfo.io");
  } catch (err) {
    console.error("All IP geolocation fallbacks failed:", err);
    throw new Error("Failed to determine location from IP address");
  }
}
