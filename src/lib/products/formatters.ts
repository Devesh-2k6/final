export function formatExpiryDisplay(dateString: string, nowMs?: number) {
  const expiryDate = new Date(dateString);
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

/** True if product expires within the next `hours` (and is not already expired). */
export function isExpiringWithinHours(
  dateString: string,
  hours: number,
  nowMs: number
): boolean {
  const diffMs = new Date(dateString).getTime() - nowMs;
  return diffMs > 0 && diffMs < hours * 3600 * 1000;
}

// ─── Freshness Level ────────────────────────────────────────────────
export type FreshnessLevel = "fresh" | "good" | "near-expiry" | "urgent" | "expired";

export type FreshnessInfo = {
  level: FreshnessLevel;
  label: string;
  color: string;       // tailwind text color class
  bgColor: string;     // tailwind bg color class
  dotColor: string;    // tailwind bg color for the dot
  borderColor: string; // tailwind border color for card glow
};

export function getFreshnessLevel(expiryDateStr: string, nowMs?: number): FreshnessInfo {
  const now = nowMs ?? Date.now();
  const diffMs = new Date(expiryDateStr).getTime() - now;
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.ceil(diffHours / 24);

  if (diffMs <= 0) {
    return {
      level: "expired",
      label: "Expired",
      color: "text-gray-400",
      bgColor: "bg-gray-500/10",
      dotColor: "bg-gray-400",
      borderColor: "border-gray-500/20",
    };
  }
  if (diffHours < 24) {
    return {
      level: "urgent",
      label: "Expiring Today",
      color: "text-red-500 dark:text-red-400",
      bgColor: "bg-red-500/10 dark:bg-red-500/15",
      dotColor: "bg-red-500",
      borderColor: "border-red-500/30",
    };
  }
  if (diffDays === 2) {
    return {
      level: "near-expiry",
      label: "2 Days Left",
      color: "text-orange-500 dark:text-orange-400",
      bgColor: "bg-orange-500/10 dark:bg-orange-500/15",
      dotColor: "bg-orange-500",
      borderColor: "border-orange-500/25",
    };
  }
  if (diffDays <= 5) {
    return {
      level: "near-expiry",
      label: `${diffDays} Days Left`,
      color: "text-orange-500 dark:text-orange-400",
      bgColor: "bg-orange-500/10 dark:bg-orange-500/15",
      dotColor: "bg-orange-500",
      borderColor: "border-orange-500/25",
    };
  }
  if (diffDays <= 10) {
    return {
      level: "good",
      label: "Good Deal",
      color: "text-amber-500 dark:text-amber-400",
      bgColor: "bg-amber-500/10 dark:bg-amber-500/15",
      dotColor: "bg-amber-500",
      borderColor: "border-amber-500/20",
    };
  }
  return {
    level: "fresh",
    label: "Fresh Deal",
    color: "text-emerald-500 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10 dark:bg-emerald-500/15",
    dotColor: "bg-emerald-500",
    borderColor: "border-emerald-500/20",
  };
}

// ─── Urgency Badge ──────────────────────────────────────────────────
export type UrgencyBadgeType = "selling-fast" | "expires-today" | "limited-stock";

export type UrgencyBadgeInfo = {
  type: UrgencyBadgeType;
  label: string;
  icon: string;   // emoji
  color: string;   // tailwind text color
  bgColor: string; // tailwind bg color
  pulse: boolean;
};

export function getUrgencyBadge(
  expiryDateStr: string,
  quantity: number,
  nowMs?: number
): UrgencyBadgeInfo | null {
  const now = nowMs ?? Date.now();
  const diffMs = new Date(expiryDateStr).getTime() - now;
  const diffHours = diffMs / (1000 * 60 * 60);

  // Selling Fast takes highest priority (qty ≤ 3)
  if (quantity > 0 && quantity <= 3) {
    return {
      type: "selling-fast",
      label: "Selling Fast",
      icon: "🔥",
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-500/15 dark:bg-red-500/20",
      pulse: true,
    };
  }

  // Expires Today (< 24 hours left)
  if (diffMs > 0 && diffHours < 24) {
    return {
      type: "expires-today",
      label: "Expires Today",
      icon: "⏰",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-500/15 dark:bg-orange-500/20",
      pulse: true,
    };
  }

  // Limited Stock (qty ≤ 5)
  if (quantity > 0 && quantity <= 5) {
    return {
      type: "limited-stock",
      label: "Limited Stock",
      icon: "📦",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/15 dark:bg-amber-500/20",
      pulse: false,
    };
  }

  return null;
}

// ─── Expiry countdown label ─────────────────────────────────────────
export function getExpiryCountdownLabel(expiryDateStr: string, nowMs?: number): string {
  const now = nowMs ?? Date.now();
  const diffMs = new Date(expiryDateStr).getTime() - now;

  if (diffMs <= 0) return "Expired";

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return `Expires in ${mins} min${mins !== 1 ? "s" : ""}`;
  }
  if (diffHours < 24) {
    return `Expires in ${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
  }
  if (diffDays === 1) return "Expires tomorrow";
  return `Expires in ${diffDays} days`;
}
