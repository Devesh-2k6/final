"use client";

import React from "react";
import { motion } from "framer-motion";

interface ImpactTrackerProps {
  data: number[];
  label: string;
  color: string;
}

export function ImpactTracker({ data, label, color }: ImpactTrackerProps) {
  // Simple SVG line chart
  const max = Math.max(...data, 1);
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (val / max) * 100;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-emerald-100/40 dark:border-gray-700 shadow-sm">
      <div className="flex justify-between items-end mb-4">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white">
            {data[data.length - 1].toFixed(1)} <span className="text-sm font-bold text-gray-400">Trend</span>
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
            +12% vs last week
          </span>
        </div>
      </div>
      
      <div className="h-24 w-full relative group">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id="impactGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`M 0,100 L ${points} L 100,100 Z`}
            fill="url(#impactGradient)"
          />
          <motion.polyline
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            fill="none"
            stroke={color}
            strokeWidth="3"
            points={points}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="flex justify-between mt-2">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
          <span key={i} className="text-[9px] font-bold text-gray-400">{day}</span>
        ))}
      </div>
    </div>
  );
}
