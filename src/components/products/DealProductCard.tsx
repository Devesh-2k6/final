"use client";

import { 
  MapPin, 
  Pause, 
  Play, 
  Package, 
  Clock, 
  Tag, 
  Heart, 
  TrendingDown, 
  Sparkles, 
  Brain, 
  MessageCircle, 
  ChefHat,
  ArrowUpRight,
  ChevronDown,
  Volume2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import React from "react";
import type { FreshnessInfo, UrgencyBadgeInfo } from "@/lib/products/formatters";
import { getSafeImageUrl } from "@/lib/images";
import { calculateAiForecast } from "@/lib/products/forecast";

export type DealProductCardProps = {
  index: number;
  id: string;
  name: string;
  imageUrl: string;
  originalPrice: number;
  discountPrice: number;
  currentPrice: number;
  isDynamicPricing: boolean;
  isSurpriseBag: boolean;
  discountPercent: number;
  expiryIsExpired: boolean;
  shopSubtitle: string;
  shopAddress?: string;
  shopPhoneNumber?: string;
  quantity: number;
  hasVoiceNote: boolean;
  playingId: string | null;
  isFavorite?: boolean;
  isFollowing?: boolean;
  shopId?: string;
  freshness: FreshnessInfo;
  urgencyBadge: UrgencyBadgeInfo | null;
  expiryCountdown: string;
  mfgDate: string;
  expiryDate: string;
  description: string | null;
  distance: number | null;
  category?: string;
  onTogglePlay: (id: string, e: React.MouseEvent) => void;
  onReserve?: (id: string) => void;
  onToggleFavorite?: (id: string, isFav: boolean, e: React.MouseEvent) => void;
  onToggleFollow?: (shopId: string, isFollowing: boolean, e: React.MouseEvent) => void;
  onQuickRecipe?: (id: string, e: React.MouseEvent) => void;
  isInRecipeBasket?: boolean;
  onToggleRecipeBasket?: (id: string, e: React.MouseEvent) => void;
};

export const DealProductCard = React.memo(function DealProductCardBase({
  index,
  id,
  name,
  imageUrl,
  originalPrice,
  currentPrice,
  isDynamicPricing,
  isSurpriseBag,
  discountPercent,
  expiryIsExpired,
  shopSubtitle,
  shopAddress,
  shopPhoneNumber,
  quantity,
  hasVoiceNote,
  playingId,
  isFavorite = false,
  isFollowing = false,
  shopId,
  freshness,
  urgencyBadge,
  expiryCountdown,
  mfgDate,
  expiryDate,
  description,
  distance,
  category,
  onTogglePlay,
  onReserve,
  onToggleFavorite,
  onToggleFollow,
  onQuickRecipe,
  isInRecipeBasket = false,
  onToggleRecipeBasket,
}: DealProductCardProps) {
  const isPlaying = playingId === id;
  const [imgSrc, setImgSrc] = React.useState(() => getSafeImageUrl(imageUrl));
  const [showForecast, setShowForecast] = React.useState(false);

  const forecast = React.useMemo(() => {
    return calculateAiForecast(originalPrice, currentPrice, quantity, expiryDate);
  }, [originalPrice, currentPrice, quantity, expiryDate]);

  React.useEffect(() => {
    setImgSrc(getSafeImageUrl(imageUrl));
  }, [imageUrl]);

  const displayCategory = (category || "SURPLUS").toUpperCase();

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white dark:bg-gray-900 rounded-[2rem] border border-slate-200/80 dark:border-gray-800 p-3.5 shadow-sm hover:shadow-md transition-all duration-300 relative flex flex-col gap-3 group"
    >
      {/* ── Top Hero Image Container ── */}
      <div className="relative w-full aspect-[16/10] rounded-[1.5rem] overflow-hidden bg-slate-100 dark:bg-gray-800">
        <Image
          src={imgSrc}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          onError={() =>
            setImgSrc(
              `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 24 24" fill="none" stroke="%23ff5b26" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="background-color:%23fff5f0"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 8h.01"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`
            )
          }
        />

        {/* Top-Left: Discount Badge */}
        <div className="absolute top-3 left-3 z-10">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-[#FF5B26] text-white shadow-md shadow-orange-500/30 tracking-tight">
            🔥 {discountPercent}% OFF
          </span>
        </div>

        {/* Top-Right: Favorite Heart Button */}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => onToggleFavorite(id, isFavorite, e)}
            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/95 dark:bg-gray-900/90 shadow-md flex items-center justify-center text-slate-400 hover:text-red-500 transition active:scale-90"
            title={isFavorite ? "Remove from Favorites" : "Save Deal"}
          >
            <Heart size={18} className={isFavorite ? "fill-red-500 text-red-500" : ""} />
          </button>
        )}

        {/* Bottom-Left: Time Remaining Pill */}
        <div className="absolute bottom-3 left-3 z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-slate-950/75 text-white backdrop-blur-md border border-white/10 shadow-sm">
            <Clock size={12} className="text-orange-400" />
            <span>{expiryCountdown}</span>
          </div>
        </div>

        {/* Bottom-Right: Voice Note Audio Player if present */}
        {hasVoiceNote && (
          <button
            type="button"
            onClick={(e) => onTogglePlay(id, e)}
            className="absolute bottom-3 right-3 z-10 w-8 h-8 rounded-full bg-orange-500/90 text-white backdrop-blur-md flex items-center justify-center shadow-md active:scale-90"
            title="Listen to Shopkeeper Voice Note"
          >
            {isPlaying ? <Pause size={14} /> : <Volume2 size={14} />}
          </button>
        )}
      </div>

      {/* ── Content & Details ── */}
      <div className="px-1 flex flex-col gap-2">
        {/* Row 1: Category Tag (Orange) + Shop Name */}
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-[#FF5B26] uppercase tracking-wider font-black text-[11px]">
            {displayCategory}
          </span>
          <div className="flex items-center gap-1 text-slate-400 dark:text-gray-400 text-xs font-semibold truncate max-w-[55%]">
            <span>🏪</span>
            <span className="truncate">{shopSubtitle}</span>
            {distance !== null && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold ml-1">
                &bull; {distance.toFixed(1)}km
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Product Title */}
        <h3 className="font-black text-slate-900 dark:text-white text-base leading-snug line-clamp-1">
          {name}
        </h3>

        {/* Row 3: Stock Quantity & AI Insights toggle */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${quantity <= 3 ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
            {quantity} left in stock
          </span>
          <button
            type="button"
            onClick={() => setShowForecast(!showForecast)}
            className="text-[10px] font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-0.5"
          >
            <Sparkles size={10} />
            AI Insights
            <ChevronDown size={10} className={`transition-transform duration-200 ${showForecast ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Expandable AI Forecast Card */}
        <AnimatePresence>
          {showForecast && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-800/40 rounded-2xl p-3 text-xs space-y-2 mt-1"
            >
              <div className="flex justify-between items-center text-[10px] font-black text-orange-800 dark:text-orange-300">
                <span>RESCUE PROBABILITY: {forecast.rescueProbability}%</span>
                <span>EST. SELLOUT: ~{forecast.selloutHours}h</span>
              </div>
              <p className="text-[10px] text-slate-600 dark:text-gray-300 leading-tight">
                Floor: ₹{forecast.optimalPrice} &bull; Save ₹{(originalPrice - currentPrice).toFixed(0)} before expiry!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Row 4: Price & Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-gray-800 mt-1">
          {/* Price Block */}
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              ₹ {currentPrice.toFixed(0)}
            </span>
            {originalPrice > currentPrice && (
              <span className="text-sm font-bold text-slate-400 line-through">
                ₹{originalPrice.toFixed(0)}
              </span>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5">
            {/* 1. Multi-Item AI Recipe Basket Toggle */}
            {onToggleRecipeBasket && (
              <button
                type="button"
                onClick={(e) => onToggleRecipeBasket(id, e)}
                className={`h-9 px-2.5 rounded-xl flex items-center gap-1 text-[11px] font-black transition active:scale-95 cursor-pointer ${
                  isInRecipeBasket
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-105"
                    : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 hover:bg-emerald-100"
                }`}
                title={isInRecipeBasket ? "In AI Recipe Basket (Tap to remove)" : "Add to AI Recipe Basket to combine dishes"}
              >
                <ChefHat size={14} className={isInRecipeBasket ? "text-white" : "text-emerald-600"} />
                <span>{isInRecipeBasket ? "In Basket ✓" : "+ Cook"}</span>
              </button>
            )}

            {/* 2. Direct 1-Tap AI Recipe Generator Modal Button */}
            {(onQuickRecipe || onToggleRecipeBasket) && (
              <button
                type="button"
                onClick={(e) => (onQuickRecipe ? onQuickRecipe(id, e) : onToggleRecipeBasket?.(id, e))}
                className="h-9 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs flex items-center gap-1 shadow-md shadow-orange-500/20 transition active:scale-95 cursor-pointer"
                title="1-Click Instant AI Recipe for this item"
              >
                <Sparkles size={13} className="text-white" />
                <span>Recipe</span>
              </button>
            )}

            {/* 3. Direct Instant Reserve Button (Orange Arrow) */}
            {onReserve && !expiryIsExpired && quantity > 0 && (
              <button
                type="button"
                onClick={() => onReserve(id)}
                className="w-9 h-9 rounded-xl bg-[#FF5B26] hover:bg-[#E54B18] text-white flex items-center justify-center shadow-md shadow-orange-500/25 transition active:scale-95 cursor-pointer shrink-0"
                title="Reserve for Instant Pickup"
              >
                <ArrowUpRight size={18} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}, (prev, next) => {
  return (
    prev.id === next.id &&
    prev.currentPrice === next.currentPrice &&
    prev.quantity === next.quantity &&
    prev.isFavorite === next.isFavorite &&
    prev.isFollowing === next.isFollowing &&
    prev.freshness.level === next.freshness.level &&
    prev.urgencyBadge?.type === next.urgencyBadge?.type &&
    prev.distance === next.distance &&
    prev.description === next.description &&
    prev.isInRecipeBasket === next.isInRecipeBasket &&
    (prev.playingId === prev.id) === (next.playingId === next.id)
  );
});

DealProductCard.displayName = "DealProductCard";
