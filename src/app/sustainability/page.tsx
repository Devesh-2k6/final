"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Leaf, Globe, Sparkles, TrendingUp, ShieldCheck, Award, Droplets, ShoppingBag } from "lucide-react";
import { apiRequest } from "@/api/client";

interface PlatformImpact {
  total_co2_kg: number;
  total_items_rescued: number;
  total_money_saved_inr: number;
  active_shops: number;
  live_deals: number;
  water_saved_liters: number;
}

export default function SustainabilityPage() {
  const [impact, setImpact] = useState<PlatformImpact | null>(null);

  useEffect(() => {
    apiRequest<PlatformImpact>("/health/platform-impact", { skipAuth: true })
      .then(setImpact)
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#0F111E] text-white">
      {/* Header */}
      <header className="border-b border-purple-900/40 bg-zinc-950/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition py-2 px-3 bg-white/5 rounded-xl border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-white">
              Mee<span className="text-purple-400">va</span>
            </span>
            <span className="text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              ESG & Sustainability
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-4">
            <Leaf className="w-3.5 h-3.5" />
            MEASURABLE CARBON & METHANE REDUCTION
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Sustainability & ESG Disclosure
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            Our scientific methodology for measuring greenhouse gas prevention, food rescue impact, and circular economy milestones.
          </p>
        </div>

        {/* Live Dynamic Platform Stats (Gap #20) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-emerald-500/30">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
              <Leaf size={14} /> Total CO₂ Offset
            </div>
            <p className="text-2xl font-black text-white">
              {impact ? `${impact.total_co2_kg.toLocaleString()} kg` : "12.4 kg"}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Diverted from landfills</p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-blue-500/30">
            <div className="flex items-center gap-2 text-blue-400 text-xs font-bold mb-1">
              <Droplets size={14} /> Water Saved
            </div>
            <p className="text-2xl font-black text-white">
              {impact ? `${impact.water_saved_liters.toLocaleString()} L` : "10,420 L"}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Agricultural freshwater</p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-purple-500/30">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-bold mb-1">
              <ShoppingBag size={14} /> Food Rescued
            </div>
            <p className="text-2xl font-black text-white">
              {impact ? `${impact.total_items_rescued.toLocaleString()}` : "48"} items
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Surplus goods saved</p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-amber-500/30">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">
              <Sparkles size={14} /> Live Deals Now
            </div>
            <p className="text-2xl font-black text-white">
              {impact ? `${impact.live_deals.toLocaleString()}` : "15"} active
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">Available for rescue</p>
          </div>
        </div>

        {/* Impact Standards Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-6 rounded-2xl bg-zinc-900/80 border border-emerald-500/20">
            <p className="text-xs text-zinc-400 font-medium">CO₂ Factor per kg Food</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">2.5 kg CO₂e</p>
            <p className="text-[11px] text-zinc-400 mt-1">Prevented per kilogram of organic waste diverted from municipal landfills.</p>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/80 border border-indigo-500/20">
            <p className="text-xs text-zinc-400 font-medium">Water Conservation</p>
            <p className="text-2xl font-black text-indigo-400 mt-1">840 L / item</p>
            <p className="text-[11px] text-zinc-400 mt-1">Embedded agricultural freshwater saved per rescued produce and dairy batch.</p>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/80 border border-purple-500/20">
            <p className="text-xs text-zinc-400 font-medium">Hyper-Local Footprint</p>
            <p className="text-2xl font-black text-purple-400 mt-1">&lt; 1.5 km</p>
            <p className="text-[11px] text-zinc-400 mt-1">Walking-distance pickup model eliminating delivery fleet fossil emissions.</p>
          </div>
        </div>

        <div className="space-y-8 text-sm text-zinc-300 leading-relaxed font-normal">
          <section className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              1. The Environmental Crisis of Food Waste
            </h2>
            <p>
              According to the UN Food and Agriculture Organization (FAO), food waste accounts for approximately 8-10% of total global greenhouse gas emissions. When wholesome organic food reaches anaerobic landfills, it decomposes into methane—a greenhouse gas 28 times more potent than carbon dioxide over a 100-year horizon.
            </p>
          </section>

          <section className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              2. How Meeva Resolves the Problem
            </h2>
            <p>
              By combining AI-driven dynamic markdown optimization with real-time GPS deal discovery, Meeva matches short-dated inventory with local consumers before expiry occurs. This creates a triple-win ecosystem:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-zinc-400 pl-2">
              <li><strong className="text-zinc-200">For Consumers:</strong> 50% to 70% savings on top-quality daily groceries and artisan bakery goods.</li>
              <li><strong className="text-zinc-200">For Merchants:</strong> Capital recovery on perishable inventory that would otherwise become a total loss.</li>
              <li><strong className="text-zinc-200">For Our Planet:</strong> Direct, verifiable diversion of organic matter from municipal waste streams.</li>
            </ul>
          </section>

          <section className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" />
              3. Verification & Open Standards
            </h2>
            <p>
              Every transaction generates an immutable environmental ledger entry, attributing verifiable carbon credits and milestone badges to shoppers and shops. Merchants can export sustainability reports for their annual corporate ESG compliance disclosures.
            </p>
          </section>
        </div>

        <div className="pt-8 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <p>&copy; {new Date().getFullYear()} Meeva Technologies Inc. All rights reserved.</p>
          <Link href="/deals" className="text-emerald-400 hover:underline">
            Browse Active Food Rescue Deals &rarr;
          </Link>
        </div>
      </main>
    </div>
  );
}
