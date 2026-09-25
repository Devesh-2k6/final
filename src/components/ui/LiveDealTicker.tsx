"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ShoppingCart, TrendingDown } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";

const PLATFORM_STATUS_MESSAGES = [
  "Live surplus radar active — real-time listings from local verified stores.",
  "Rescue fresh groceries before expiry at steep discounts.",
  "Support local merchants and prevent food waste in your community.",
  "Real-time notifications enabled for nearby markdown drops.",
];

export function LiveDealTicker() {
  const { lastDeal } = useWebSocket();
  const [message, setMessage] = useState(PLATFORM_STATUS_MESSAGES[0]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (lastDeal) {
      setMessage(`🔥 LIVE DROP: ${lastDeal.name} just listed for ₹${(lastDeal.current_price ?? lastDeal.discount_price).toFixed(0)}!`);
    }
  }, [lastDeal]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % PLATFORM_STATUS_MESSAGES.length);
      if (!lastDeal) {
        setMessage(PLATFORM_STATUS_MESSAGES[(index + 1) % PLATFORM_STATUS_MESSAGES.length]);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [index, lastDeal]);

  return (
    <div className="bg-emerald-600/10 dark:bg-emerald-500/5 border-y border-emerald-500/20 py-2 overflow-hidden relative">
      <div className="max-w-2xl mx-auto px-4 flex items-center gap-3">
        <div className="flex-shrink-0 flex items-center gap-1 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded animate-pulse">
          <Zap size={10} fill="white" /> Live
        </div>

        <div className="flex-1 relative h-4 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={message}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.5, ease: "circOut" }}
              className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 truncate"
            >
              {message}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest">
          <TrendingDown size={12} /> Real-time
        </div>
      </div>
    </div>
  );
}
