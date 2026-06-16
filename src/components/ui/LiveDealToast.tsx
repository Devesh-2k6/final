"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, X, ArrowRight } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useSound } from "@/hooks/useSound";
import type { ApiProduct } from "@/types/product";

export function LiveDealToast() {
  const { lastDeal } = useWebSocket();
  const { playPopSound } = useSound();
  const [deal, setDeal] = useState<ApiProduct | null>(null);

  useEffect(() => {
    if (lastDeal) {
      setDeal(lastDeal);
      playPopSound();
      
      // Auto-dismiss after 10 seconds
      const t = setTimeout(() => {
        setDeal(null);
      }, 10000);
      
      return () => clearTimeout(t);
    }
  }, [lastDeal, playPopSound]);

  return (
    <AnimatePresence>
      {deal && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-6 right-6 z-[100] max-w-sm w-full"
        >
          <div className="bg-[#1A1A1A]/90 backdrop-blur-xl border border-emerald-500/30 shadow-[0_10px_40px_rgba(16,185,129,0.3)] rounded-2xl overflow-hidden p-4 relative">
            <button 
              onClick={() => setDeal(null)} 
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
            >
              <X size={16} />
            </button>
            
            <div className="flex items-start gap-4">
              <div className="bg-emerald-500/20 text-emerald-400 p-2.5 rounded-xl animate-pulse">
                <Zap size={20} />
              </div>
              <div className="flex-1 pr-6">
                <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-1">Live Drop!</p>
                <h4 className="text-white font-bold text-sm mb-1 line-clamp-1">{deal.shop?.name || "A local shop"} just posted:</h4>
                <p className="text-gray-300 text-sm font-medium mb-3 line-clamp-1">{deal.name} at ₹{(deal.current_price ?? deal.discount_price).toFixed(2)}</p>
                <button 
                  onClick={() => window.location.href = "/deals"} 
                  className="text-xs font-bold bg-white text-black px-4 py-2 rounded-lg flex items-center gap-1.5 hover:bg-gray-200 transition"
                >
                  Grab it <ArrowRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
