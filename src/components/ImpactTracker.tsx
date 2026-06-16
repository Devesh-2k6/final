"use client";

import { motion } from "framer-motion";
import { TreePine, IndianRupee, Trophy, Medal } from "lucide-react";
import React from "react";

export type ImpactTrackerProps = {
  totalSavedAmount: number;
  totalItemsSaved: number;
  co2SavedKg: number;
};

export function ImpactTracker({ totalSavedAmount, totalItemsSaved, co2SavedKg }: ImpactTrackerProps) {
  const getBadge = (items: number) => {
    if (items >= 50) return { name: "Eco Warrior", icon: Trophy, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10" };
    if (items >= 10) return { name: "Savvy Saver", icon: Medal, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-500/10" };
    return null;
  };

  const badge = getBadge(totalItemsSaved);

  return (
    <div className="glass-card rounded-3xl p-6 relative overflow-hidden">
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
      
      <div className="flex justify-between items-center mb-6 relative z-10">
        <h2 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">Your Impact</h2>
        {badge && (
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${badge.bg} border border-white/50 dark:border-gray-700/50 shadow-sm`}>
            <badge.icon size={14} className={badge.color} />
            <span className={`text-xs font-bold ${badge.color}`}>{badge.name}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 relative z-10">
        {/* Money Saved */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-700/50"
        >
          <div className="bg-emerald-100 dark:bg-emerald-900/30 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
            <IndianRupee className="text-emerald-600 dark:text-emerald-400" size={20} />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Money Saved</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">₹{totalSavedAmount.toFixed(0)}</p>
        </motion.div>

        {/* CO2 Saved */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-700/50"
        >
          <div className="bg-blue-100 dark:bg-blue-900/30 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
            <TreePine className="text-blue-600 dark:text-blue-400" size={20} />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">CO₂ Prevented</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{co2SavedKg.toFixed(1)} <span className="text-sm font-semibold text-gray-400">kg</span></p>
        </motion.div>

        {/* Items Saved */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-700/50 col-span-2 sm:col-span-1"
        >
          <div className="bg-orange-100 dark:bg-orange-900/30 w-10 h-10 rounded-xl flex items-center justify-center mb-3">
            <span className="text-orange-600 dark:text-orange-400 font-black text-lg">x{totalItemsSaved}</span>
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Items Rescued</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{totalItemsSaved}</p>
        </motion.div>
      </div>
    </div>
  );
}
