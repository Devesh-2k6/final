"use client";

import { MapPin, Pause, Play, Package, Clock, Tag, Heart, TrendingDown, Sparkles, Brain, MessageCircle, ChefHat } from "lucide-react";
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
  // ── New urgency/freshness props ──
  freshness: FreshnessInfo;
  urgencyBadge: UrgencyBadgeInfo | null;
  expiryCountdown: string;
  mfgDate: string;
  expiryDate: string;
  description: string | null;
  distance: number | null;
  onTogglePlay: (id: string, e: React.MouseEvent) => void;
  onReserve?: (id: string) => void;
  onToggleFavorite?: (id: string, isFav: boolean, e: React.MouseEvent) => void;
  onToggleFollow?: (shopId: string, isFollowing: boolean, e: React.MouseEvent) => void;
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
  onTogglePlay,
  onReserve,
  onToggleFavorite,
  onToggleFollow,
  isInRecipeBasket = false,
  onToggleRecipeBasket,
}: DealProductCardProps) {
  const isPlaying = playingId === id;
  const [imgSrc, setImgSrc] = React.useState(() => getSafeImageUrl(imageUrl));
  const [showForecast, setShowForecast] = React.useState(false);

  const forecast = React.useMemo(() => {
    return calculateAiForecast(originalPrice, currentPrice, quantity, expiryDate);
  }, [originalPrice, currentPrice, quantity, expiryDate]);

  const timeFraction = React.useMemo(() => {
    const nowMs = Date.now();
    const expiryMs = new Date(expiryDate).getTime();
    const timeLeft = Math.max(0, expiryMs - nowMs);
    const totalDuration = 48 * 3600 * 1000; // 48 hours reference
    return Math.min(1, timeLeft / totalDuration);
  }, [expiryDate]);

  React.useEffect(() => {
    setImgSrc(getSafeImageUrl(imageUrl));
  }, [imageUrl]);

  // Determine card border glow animation based on freshness
  const borderGlowClass =
    freshness.level === "urgent"
      ? "animate-border-glow-red"
      : freshness.level === "near-expiry"
      ? "animate-border-glow-orange"
      : "";

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const phone = shopPhoneNumber || "919876543210"; // Fallback for demo
    const text = encodeURIComponent(`Hi ${shopSubtitle}! I'm interested in the "${name}" deal on ExpiryGo. Is it still available?`);
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  };


  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className={`glass-card rounded-[2.25rem] shadow-[0_8px_30px_rgba(16,185,129,0.03)] border transition-all duration-300 hover:shadow-[0_20px_40px_rgba(16,185,129,0.07)] ${
        isSurpriseBag
          ? "border-purple-200 shadow-purple-500/20"
          : freshness.level === "urgent" || freshness.level === "near-expiry"
          ? `${freshness.borderColor} ${borderGlowClass}`
          : "border-emerald-100/50"
      } overflow-hidden flex flex-col sm:flex-row gap-4 p-4 ${isDynamicPricing ? "pulse-glow" : ""} relative`}
    >
      {/* ── Urgency Badge (top-left overlay) ── */}
      <AnimatePresence>
        {(urgencyBadge || quantity <= 2) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7, x: -8 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ type: "spring", stiffness: 400, damping: 20, delay: index * 0.05 + 0.15 }}
            className={`absolute top-3 left-3 z-10 flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold ${
              quantity <= 2 ? "text-white bg-red-600" : (urgencyBadge?.color + " " + urgencyBadge?.bgColor)
            } backdrop-blur-md shadow-sm border border-emerald-500/10 ${
              (urgencyBadge?.pulse || quantity <= 2) ? "animate-urgency-pulse" : ""
            }`}
          >
            {(urgencyBadge?.pulse || quantity <= 2) && (
              <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping pointer-events-none" />
            )}
            <span className="text-xs leading-none relative z-10">{quantity <= 2 ? "⚡" : urgencyBadge?.icon}</span>
            <span className="relative z-10">{quantity <= 2 ? `ONLY ${quantity} LEFT!` : urgencyBadge?.label}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-4 flex-1 min-w-0">
        {/* ── Image ── */}
        <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border border-emerald-100/40 relative">
          <Image 
            src={imgSrc} 
            alt={name} 
            fill 
            sizes="96px" 
            className="object-cover" 
            onError={() => setImgSrc(`data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 24 24" fill="none" stroke="%2310b981" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="background-color:%23f4fbf7"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 8h.01"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`)}
          />
          {isSurpriseBag && (
            <div className="absolute inset-0 bg-gradient-to-t from-purple-900/80 to-transparent flex items-end justify-center pb-1">
              <span className="text-[10px] font-bold text-white flex items-center gap-1">
                <Package size={10} /> Surprise
              </span>
            </div>
          )}

          {/* Freshness dot indicator (bottom-right of image) */}
          <div className="absolute bottom-1.5 right-1.5 z-10">
            <div
              className={`w-2.5 h-2.5 rounded-full ${freshness.dotColor} ring-2 ring-white ${
                freshness.level === "urgent" ? "animate-freshness-breath" : ""
              }`}
              title={freshness.label}
            />
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            {/* Row 1: Name + Discount badge + Favorite */}
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                {/* Dynamic Trending / Fast Selling / Saved Badges */}
                <div className="flex gap-1.5 flex-wrap mb-1">
                  {quantity <= 3 && (
                    <span className="inline-flex items-center gap-0.5 bg-red-500/15 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
                      ⚡ Fast Selling
                    </span>
                  )}
                  {discountPercent >= 60 && (
                    <span className="inline-flex items-center gap-0.5 bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                      🔥 Hot Deal
                    </span>
                  )}
                  {isFavorite && (
                    <span className="inline-flex items-center gap-0.5 bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                      ⭐ Saved Deal
                    </span>
                  )}
                </div>
                <h2 className="font-bold text-slate-900 dark:text-white truncate text-base">{name}</h2>
              </div>
              <div className="flex gap-2 items-center flex-shrink-0">
                {onToggleFavorite && (
                  <button
                    onClick={(e) => onToggleFavorite(id, isFavorite, e)}
                    className="p-1 -m-1 text-slate-400 hover:text-red-500 transition"
                  >
                    <Heart size={16} className={isFavorite ? "fill-red-500 text-red-500" : ""} />
                  </button>
                )}
                {onToggleRecipeBasket && (
                  <button
                    onClick={(e) => onToggleRecipeBasket(id, e)}
                    className={`p-1 -m-1 transition ml-2 ${
                      isInRecipeBasket ? "text-emerald-650 hover:text-emerald-700" : "text-slate-400 hover:text-emerald-500"
                    }`}
                    title={isInRecipeBasket ? "Remove from AI Recipe Basket" : "Add to AI Recipe Basket"}
                  >
                    <ChefHat size={16} className={isInRecipeBasket ? "fill-emerald-600/20" : ""} />
                  </button>
                )}
                {/* Discount percentage badge */}
                <motion.span
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 + 0.2, duration: 0.35 }}
                  className={`text-xs font-bold px-2 py-0.5 rounded-full animate-slide-in-right ${
                    discountPercent >= 50
                      ? "bg-emerald-50 text-emerald-700"
                      : isSurpriseBag
                      ? "bg-purple-50 text-purple-700"
                      : "text-emerald-700 bg-emerald-50"
                  }`}
                >
                  -{discountPercent}%
                </motion.span>
              </div>
            </div>

            {/* Description */}
            {description && (
              <p className="text-xs text-slate-600 dark:text-gray-400 mt-1 line-clamp-2" title={description}>
                {description}
              </p>
            )}

            {/* Row 2: Shop name + Freshness label + Follow */}
            <div className="flex flex-wrap items-center gap-2 mt-1.5 max-w-full">
              <p className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1 min-w-0 max-w-full">
                <MapPin size={12} className="text-emerald-600 flex-shrink-0" />
                <span className="font-bold text-slate-800 dark:text-white flex-shrink-0">{shopSubtitle}</span>
                {shopAddress && <span className="text-slate-400 truncate min-w-0">({shopAddress})</span>}
                {distance !== null && distance !== undefined && (
                  <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-455 px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0">
                    {distance.toFixed(1)} km
                  </span>
                )}
              </p>

              {/* Freshness indicator pill */}
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${freshness.color} ${freshness.bgColor}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${freshness.dotColor} ${
                    freshness.level === "urgent" ? "animate-freshness-breath" : ""
                  }`}
                />
                {freshness.label}
              </span>

              {onToggleFollow && shopId && (
                <button
                  onClick={(e) => onToggleFollow(shopId, isFollowing, e)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition ${
                    isFollowing
                      ? "bg-slate-100 text-slate-600"
                      : "bg-blue-50 text-blue-700"
                  }`}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              )}
            </div>
          </div>

          {/* Row 3: Enhanced Price Display */}
          <div className="flex items-end justify-between mt-2">
            <div>
              <div className="flex items-baseline gap-2">
                <motion.span
                  key={currentPrice}
                  initial={{ y: -4, opacity: 0.6 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={`text-lg font-extrabold ${
                    isDynamicPricing
                      ? "text-orange-500"
                      : freshness.level === "urgent"
                      ? "text-red-600"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  ₹{currentPrice.toFixed(2)}
                </motion.span>
                <span className="text-sm text-slate-400 line-through">₹{originalPrice.toFixed(2)}</span>
              </div>
              {isDynamicPricing && (
                <motion.p
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-[10px] text-orange-500 font-bold flex items-center gap-0.5 mt-0.5"
                >
                  <TrendingDown size={10} className="animate-price-drop" />
                  Price dropping live!
                </motion.p>
              )}
            </div>

            {/* Savings badge */}
            {discountPercent >= 30 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 + 0.25, type: "spring", stiffness: 350, damping: 18 }}
                className="flex flex-col items-end gap-1"
              >
                <div className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                  Save ₹{(originalPrice - currentPrice).toFixed(0)}
                </div>
                {forecast.rescueProbability >= 80 && (
                  <div className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 uppercase tracking-tighter">
                    <Sparkles size={8} className="animate-pulse" /> AI Choice
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Row 4: MFG date, expiry date, countdown + stock */}
          <div className="flex flex-col gap-1.5 mt-3 pt-2 border-t border-emerald-100/30">
            <div className="flex flex-wrap items-center gap-2 text-[9px] font-bold text-slate-500 dark:text-gray-400">
              <span className="bg-slate-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                MFG: {new Date(mfgDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="bg-slate-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                EXP: {new Date(expiryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span
                className={`px-2 py-0.5 rounded-md flex items-center gap-1.5 ${
                  expiryIsExpired
                    ? "bg-slate-100 text-slate-500"
                    : freshness.level === "urgent"
                    ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                    : freshness.level === "near-expiry"
                    ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400"
                    : isDynamicPricing
                    ? "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400"
                    : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                }`}
              >
                {/* SVG circular expiry progress ring */}
                {!expiryIsExpired && (
                  <svg className="w-3.5 h-3.5 transform -rotate-90 flex-shrink-0" viewBox="0 0 20 20">
                    <circle
                      cx="10"
                      cy="10"
                      r="8"
                      className="stroke-slate-200/50 dark:stroke-gray-700/50"
                      strokeWidth="2.5"
                      fill="transparent"
                    />
                    <circle
                      cx="10"
                      cy="10"
                      r="8"
                      className={`transition-all duration-500 ${
                        freshness.level === "urgent"
                          ? "stroke-red-500"
                          : freshness.level === "near-expiry"
                          ? "stroke-orange-500"
                          : freshness.level === "good"
                          ? "stroke-amber-500"
                          : "stroke-emerald-500"
                      }`}
                      strokeWidth="2.5"
                      fill="transparent"
                      strokeDasharray="50.26"
                      strokeDashoffset={50.26 * (1 - timeFraction)}
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                {expiryCountdown}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              {/* Low stock bar and description */}
              <div className="flex flex-col gap-1 w-full max-w-[180px]">
                <span
                  className={`text-[10px] font-bold ${
                    quantity <= 3
                      ? "text-red-600 animate-pulse"
                      : quantity <= 5
                      ? "text-amber-600"
                      : "text-slate-500 dark:text-gray-455"
                  }`}
                >
                  {quantity <= 3 ? `🔥 Only ${quantity} left!` : `${quantity} left`}
                </span>
                {quantity <= 5 && (
                  <div className="w-full bg-slate-100 dark:bg-gray-800 h-1 rounded-full overflow-hidden mt-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        quantity <= 3 ? "bg-red-500 animate-pulse" : "bg-amber-500"
                      }`}
                      style={{ width: `${(quantity / 10) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap mt-2.5">
            {hasVoiceNote && (
              <button
                type="button"
                onClick={(e) => onTogglePlay(id, e)}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1.5 rounded-xl hover:bg-emerald-100/50 transition cursor-pointer"
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                Voice note
              </button>
            )}
            
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setShowForecast(!showForecast);
              }}
              className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-xl border transition cursor-pointer ${
                showForecast
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/20"
                  : "bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 hover:border-emerald-300 text-emerald-700 dark:text-emerald-400"
              }`}
            >
              <Sparkles size={14} className={showForecast ? "animate-spin" : ""} />
              AI Forecast
            </button>

            <button
              type="button"
              onClick={handleWhatsApp}
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1.5 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition cursor-pointer"
            >
              <MessageCircle size={14} className="text-emerald-600" />
              Chat
            </button>
          </div>

          {/* AI Forecast expandable subsection */}
          <AnimatePresence>
            {showForecast && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden mt-2"
              >
                <div className="p-3.5 bg-emerald-500/[0.03] dark:bg-emerald-950/10 border border-emerald-100/60 dark:border-emerald-900/30 rounded-2xl space-y-2.5 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-355 flex items-center gap-1">
                      <Brain size={12} className="text-emerald-650" /> AI Forecast Insights
                    </span>
                    <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 text-[8px] font-extrabold px-1.5 py-0.5 rounded-md tracking-wider">
                      CONFIDENCE {forecast.confidenceScore}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-xl border border-emerald-100/30 dark:border-gray-700/50 shadow-sm flex flex-col items-center">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Rescue Prob.</span>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-450 mt-0.5">{forecast.rescueProbability}%</span>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-xl border border-emerald-100/30 dark:border-gray-700/50 shadow-sm flex flex-col items-center">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Est. Sellout</span>
                      <span className="text-sm font-black text-orange-500 mt-0.5">~{forecast.selloutHours}h</span>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-xl border border-emerald-100/30 dark:border-gray-700/50 shadow-sm flex flex-col items-center">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">AI Suggested</span>
                      <span className="text-sm font-black text-emerald-700 dark:text-emerald-450 mt-0.5">₹{forecast.optimalPrice}</span>
                    </div>
                  </div>

                  <p className="text-[9px] text-slate-500 dark:text-gray-400 leading-relaxed font-semibold">
                    {discountPercent >= forecast.optimalDiscountPercent ? (
                      <span>
                        ✅ Current discount of <strong className="text-emerald-700 dark:text-emerald-450 font-bold">{discountPercent}% off</strong> is already optimized to maximize rescues given the high stock and remaining time.
                      </span>
                    ) : (
                      <span>
                        💡 Suggested discount is <strong className="text-emerald-700 dark:text-emerald-450 font-bold">{forecast.optimalDiscountPercent}% off</strong> to improve rescue probability.
                      </span>
                    )}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Reservation Section */}
      {onReserve && !expiryIsExpired && quantity > 0 && (
        <div className="w-full sm:w-40 sm:min-w-[160px] flex-shrink-0 flex flex-col justify-end mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-l border-emerald-100/40 sm:pl-4">
          <button
            onClick={() => onReserve(id)}
            className={`w-full font-bold text-sm py-2 rounded-xl transition shadow-sm active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              freshness.level === "urgent"
                ? "bg-red-500 hover:bg-red-600 text-white shadow-sm"
                : "bg-emerald-600 hover:bg-emerald-500 hover:shadow-md hover:shadow-emerald-950/10 text-white"
            }`}
          >
            <Tag size={14} />
            {freshness.level === "urgent" ? "Grab Now" : "Reserve"}
          </button>
        </div>
      )}
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
