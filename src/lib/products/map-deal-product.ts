import type { ApiProduct } from "@/types/product";
import type { DealProductCardProps } from "@/components/products/DealProductCard";
import {
  getFreshnessLevel,
  getUrgencyBadge,
  getExpiryCountdownLabel,
  type FreshnessInfo,
  type UrgencyBadgeInfo,
} from "./formatters";

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function buildDealProductCardProps(
  product: ApiProduct,
  index: number,
  playingId: string | null,
  onTogglePlay: (id: string, e: React.MouseEvent) => void,
  onReserve?: (id: string) => void,
  userLat?: number,
  userLng?: number
): DealProductCardProps {
  const now = Date.now();
  const expiryDate = new Date(product.expiry_date);
  const diffMs = expiryDate.getTime() - now;
  const expiryIsExpired = diffMs <= 0;
  const expiryCountdown = getExpiryCountdownLabel(product.expiry_date, now);

  const actualPrice = product.current_price !== null ? product.current_price : product.discount_price;

  const discountPercent =
    product.original_price > 0
      ? Math.round(
          ((product.original_price - actualPrice) / product.original_price) * 100
        )
      : 0;

  // ── New: compute freshness + urgency ──────────────────────────────
  const freshness: FreshnessInfo = getFreshnessLevel(product.expiry_date, now);
  const urgencyBadge: UrgencyBadgeInfo | null = getUrgencyBadge(
    product.expiry_date,
    product.quantity,
    now
  );

  let distance: number | null = null;
  if (
    userLat !== undefined &&
    userLng !== undefined &&
    product.shop?.latitude !== undefined &&
    product.shop?.longitude !== undefined
  ) {
    distance = haversineDistance(userLat, userLng, product.shop.latitude, product.shop.longitude);
  }

  return {
    index,
    id: product.id,
    name: product.name,
    imageUrl: product.front_image_url,
    originalPrice: product.original_price,
    discountPrice: product.discount_price,
    currentPrice: actualPrice,
    isDynamicPricing: product.auto_discount_enabled && actualPrice < product.discount_price,
    isSurpriseBag: product.is_surprise_bag,
    discountPercent,
    expiryIsExpired,
    shopId: product.shop_id,
    shopSubtitle: product.shop?.name ?? "Local Shop",
    shopAddress: product.shop?.address,
    shopPhoneNumber: product.shop?.phone_number,
    quantity: product.quantity,
    hasVoiceNote: !!product.voice_note_url,
    playingId,
    onTogglePlay,
    onReserve,
    // ── New props ──
    freshness,
    urgencyBadge,
    expiryCountdown,
    mfgDate: product.manufacturing_date,
    expiryDate: product.expiry_date,
    description: product.description,
    distance,
  };
}
