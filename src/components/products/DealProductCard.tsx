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
  Volume2,
  ShoppingBag
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
  const [imgSrc, setImgSrc] = React.useState(() => getSafeImageUrl(imageUrl, name, category));
  const [showForecast, setShowForecast] = React.useState(false);

  const forecast = React.useMemo(() => {
    return calculateAiForecast(originalPrice, currentPrice, quantity, expiryDate);
  }, [originalPrice, currentPrice, quantity, expiryDate]);

  React.useEffect(() => {
    setImgSrc(getSafeImageUrl(imageUrl, name, category));
  }, [imageUrl, name, category]);

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
          onError={() => setImgSrc(getSafeImageUrl(null, name, category))}
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
            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/95 dark:bg-gray-900/90 shadow-md flex items-center justify-center text-slate-400 hover:text-red-500 transition active:scale-90 cursor-pointer"
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
            className="absolute bottom-3 right-3 z-10 w-8 h-8 rounded-full bg-orange-500/90 text-white backdrop-blur-md flex items-center justify-center shadow-md active:scale-90 cursor-pointer"
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
            className="text-[10px] font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-0.5 cursor-pointer"
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
        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-gray-800 mt-1">
          {/* Price Block (Strictly No-Wrap) */}
          <div className="flex items-baseline gap-1.5 shrink-0 whitespace-nowrap">
            <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              ₹{Math.round(currentPrice)}
            </span>
            {originalPrice > currentPrice && (
              <span className="text-xs font-semibold text-slate-400 line-through">
                ₹{Math.round(originalPrice)}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* AI Recipe Generator Button */}
            {(onQuickRecipe || onToggleRecipeBasket) && (
              <button
                type="button"
                onClick={(e) => (onQuickRecipe ? onQuickRecipe(id, e) : onToggleRecipeBasket?.(id, e))}
                className="h-8 px-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/60 text-orange-600 dark:text-orange-400 border border-orange-200/80 dark:border-orange-800/60 font-bold text-xs flex items-center gap-1 transition active:scale-95 cursor-pointer"
                title="1-Click Instant AI Recipe for this item"
              >
                <Sparkles size={12} className="text-orange-500" />
                <span>Recipe</span>
              </button>
            )}

            {/* Direct Order / Buy Button (Swiggy / Zepto Style) */}
            {onReserve && !expiryIsExpired && quantity > 0 && (
              <button
                type="button"
                onClick={() => onReserve(id)}
                className="h-8 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/25 transition active:scale-95 cursor-pointer shrink-0"
                title="Order for Doorstep Delivery or Store Pickup"
              >
                <ShoppingBag size={13} />
                <span>Order</span>
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
