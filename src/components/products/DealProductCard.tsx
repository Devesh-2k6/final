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
  ShoppingBag,
  Store,
  ShieldCheck
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
      className="bg-white dark:bg-[#0F141F] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-3 shadow-xs hover:shadow-xl hover:shadow-black/5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 relative flex flex-col gap-3 group"
    >
      {/* ── Top Hero Image Container ── */}
      <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800/80">
        <Image
          src={imgSrc}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          onError={() => setImgSrc(getSafeImageUrl(null, name, category))}
        />

        {/* Top-Left: Discount Badge */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black bg-zinc-950/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30 tracking-tight">
            {discountPercent}% OFF
          </span>
        </div>

        {/* Top-Right: Favorite Heart Button */}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => onToggleFavorite(id, isFavorite, e)}
            className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-lg bg-zinc-950/60 hover:bg-zinc-950/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-zinc-300 hover:text-rose-500 transition cursor-pointer"
            title={isFavorite ? "Remove from Favorites" : "Save Deal"}
          >
            <Heart size={15} className={isFavorite ? "fill-rose-500 text-rose-500" : ""} />
          </button>
        )}

        {/* Bottom-Left: Time Remaining Pill */}
        <div className="absolute bottom-2.5 left-2.5 z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-zinc-950/80 text-zinc-200 backdrop-blur-md border border-white/10 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{expiryCountdown}</span>
          </div>
        </div>

        {/* Bottom-Right: Voice Note Audio Player if present */}
        {hasVoiceNote && (
          <button
            type="button"
            onClick={(e) => onTogglePlay(id, e)}
            className="absolute bottom-2.5 right-2.5 z-10 w-7 h-7 rounded-lg bg-zinc-950/80 text-white backdrop-blur-md border border-white/10 flex items-center justify-center cursor-pointer"
            title="Listen to Shopkeeper Voice Note"
          >
            {isPlaying ? <Pause size={12} /> : <Volume2 size={12} />}
          </button>
        )}
      </div>

      {/* ── Content & Details ── */}
      <div className="px-1 flex flex-col gap-1.5">
        {/* Row 1: Category Tag + Shop Name */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-400 uppercase tracking-widest font-black text-[9px]">
            {displayCategory}
          </span>
          <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 font-medium truncate max-w-[60%]">
            <Store size={12} className="text-zinc-400 shrink-0" />
            <span className="truncate">{shopSubtitle}</span>
            <ShieldCheck size={11} className="text-emerald-500 shrink-0" />
            {distance !== null && (
              <span className="text-[10px] text-zinc-400 font-semibold ml-0.5">
                • {distance.toFixed(1)}km
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Product Title */}
        <h3 className="font-bold text-zinc-900 dark:text-white text-sm leading-snug line-clamp-1 capitalize">
          {name}
        </h3>

        {/* Row 3: Stock Quantity & AI Insights toggle */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${quantity <= 3 ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
            {quantity} units left
          </span>
          <button
            type="button"
            onClick={() => setShowForecast(!showForecast)}
            className="text-[10px] font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-0.5 cursor-pointer"
          >
            <Sparkles size={10} className="text-emerald-500" />
            AI Forecast
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
              className="overflow-hidden bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-2.5 text-xs space-y-1.5 mt-1"
            >
              <div className="flex justify-between items-center text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                <span>RESCUE CHANCE: {forecast.rescueProbability}%</span>
                <span>EST. SELLOUT: ~{forecast.selloutHours}h</span>
              </div>
              <p className="text-[10px] text-zinc-500 leading-tight">
                Floor: ₹{forecast.optimalPrice} • Save ₹{(originalPrice - currentPrice).toFixed(0)} before expiry!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Row 4: Price & Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80 mt-1">
          {/* Price Block */}
          <div className="flex items-baseline gap-1.5 shrink-0 whitespace-nowrap">
            <span className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">
              ₹{Math.round(currentPrice)}
            </span>
            {originalPrice > currentPrice && (
              <span className="text-xs font-medium text-zinc-400 line-through">
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
                className="h-8 px-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200/70 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold text-xs flex items-center gap-1 transition cursor-pointer"
                title="AI Recipe for this item"
              >
                <Sparkles size={11} className="text-emerald-500" />
                <span className="text-[11px]">Recipe</span>
              </button>
            )}

            {/* Direct Order Button */}
            {onReserve && !expiryIsExpired && quantity > 0 && (
              <button
                type="button"
                onClick={() => onReserve(id)}
                className="h-8 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0 shadow-xs"
                title="Claim Deal"
              >
                <ShoppingBag size={12} />
                <span>Claim</span>
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
