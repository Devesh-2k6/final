import { Colors } from "../theme";

export function formatExpiryDisplay(dateString?: string | null, nowMs?: number) {
  if (!dateString) {
    return { isExpired: false, compact: "Fresh", full: "Freshly Stocked" };
  }
  const expiryDate = new Date(dateString);
  if (isNaN(expiryDate.getTime())) {
    return { isExpired: false, compact: "Fresh", full: "Freshly Stocked" };
  }
  const now = nowMs ?? Date.now();
  const diffMs = expiryDate.getTime() - now;

  const isExpired = diffMs <= 0;

  if (isExpired) {
    return { isExpired: true, compact: "0h", full: "Expired" };
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  let compact = "";
  let full = "";

  if (diffDays > 0) {
    compact = `${diffDays}d`;
    full = `${diffDays} day${diffDays > 1 ? "s" : ""}`;
  } else {
    compact = `${diffHours}h`;
    full = `${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
  }

  return { isExpired: false, compact, full };
}

export function isExpiringWithinHours(
  dateString?: string | null,
  hours: number = 24,
  nowMs?: number
): boolean {
  if (!dateString) return false;
  const time = new Date(dateString).getTime();
  if (isNaN(time)) return false;
  const diffMs = time - (nowMs ?? Date.now());
  return diffMs > 0 && diffMs < hours * 3600 * 1000;
}

export type FreshnessLevel = "fresh" | "good" | "near-expiry" | "urgent" | "expired";

export type FreshnessInfo = {
  level: FreshnessLevel;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
};

export function getFreshnessLevel(expiryDateStr?: string | null, nowMs?: number): FreshnessInfo {
  if (!expiryDateStr) {
    return {
      level: "fresh",
      label: "Fresh Today",
      color: Colors.primary,
      bgColor: Colors.primaryLight,
      borderColor: "rgba(255, 91, 38, 0.2)",
    };
  }
  const parsed = new Date(expiryDateStr);
  if (isNaN(parsed.getTime())) {
    return {
      level: "fresh",
      label: "Fresh Today",
      color: Colors.primary,
      bgColor: Colors.primaryLight,
      borderColor: "rgba(255, 91, 38, 0.2)",
    };
  }
  const now = nowMs ?? Date.now();
  const diffMs = parsed.getTime() - now;
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.ceil(diffHours / 24);

  if (diffMs <= 0) {
    return {
      level: "expired",
      label: "Expired",
      color: Colors.textMuted,
      bgColor: "rgba(148, 163, 184, 0.1)",
      borderColor: "rgba(148, 163, 184, 0.2)",
    };
  }
  if (diffHours < 24) {
    return {
      level: "urgent",
      label: "Expiring Today",
      color: Colors.rose,
      bgColor: Colors.roseLight,
      borderColor: "rgba(239, 68, 68, 0.3)",
    };
  }
  if (diffDays <= 2) {
    return {
      level: "near-expiry",
      label: "2 Days Left",
      color: Colors.amber,
      bgColor: Colors.amberLight,
      borderColor: "rgba(245, 158, 11, 0.3)",
    };
  }
  if (diffDays <= 5) {
    return {
      level: "near-expiry",
      label: `${diffDays} Days Left`,
      color: Colors.amber,
      bgColor: Colors.amberLight,
      borderColor: "rgba(245, 158, 11, 0.25)",
    };
  }
  if (diffDays <= 10) {
    return {
      level: "good",
      label: "Good Deal",
      color: Colors.blue,
      bgColor: Colors.blueLight,
      borderColor: "rgba(59, 130, 246, 0.2)",
    };
  }
  return {
    level: "fresh",
    label: "Fresh Deal",
    color: Colors.primary,
    bgColor: Colors.primaryLight,
    borderColor: Colors.primaryGlow,
  };
}

export type UrgencyBadgeInfo = {
  type: string;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
};

export function getUrgencyBadge(
  expiryDateStr: string,
  quantity: number,
  nowMs?: number
): UrgencyBadgeInfo | null {
  const now = nowMs ?? Date.now();
  const diffMs = new Date(expiryDateStr).getTime() - now;
  const diffHours = diffMs / (1000 * 60 * 60);

  if (quantity > 0 && quantity <= 3) {
    return {
      type: "selling-fast",
      label: "Selling Fast",
      icon: "🔥",
      color: Colors.rose,
      bgColor: Colors.roseLight,
    };
  }

  if (diffHours > 0 && diffHours < 24) {
    return {
      type: "expires-today",
      label: "Expires Today",
      icon: "⚡",
      color: Colors.amber,
      bgColor: Colors.amberLight,
    };
  }

  return null;
}
