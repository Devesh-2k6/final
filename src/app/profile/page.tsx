"use client";

import { Heart, Bell, Settings, ChevronLeft, LogOut, PackageCheck, Leaf, Coins, Trophy, Star, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthenticationContext";
import { BottomNav } from "@/components/BottomNav";
import { getMyFollowing } from "@/services/shops";
import type { ApiFollower } from "@/types/product";
import { motion } from "framer-motion";
import { ImpactTracker } from "@/components/ImpactTracker";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [following, setFollowing] = useState<ApiFollower[]>([]);

  useEffect(() => {
    if (user) {
      getMyFollowing().then(setFollowing).catch(console.error);
    }
  }, [user]);

  const userLevel = useMemo(() => {
    const items = user?.total_items_saved || 0;
    if (items >= 50) return { title: "Eco Legend", level: 5, color: "text-purple-500", bg: "bg-purple-50" };
    if (items >= 25) return { title: "Waste Warrior", level: 4, color: "text-blue-500", bg: "bg-blue-50" };
    if (items >= 10) return { title: "Green Hero", level: 3, color: "text-emerald-500", bg: "bg-emerald-50" };
    if (items >= 5) return { title: "Food Saver", level: 2, color: "text-amber-500", bg: "bg-amber-50" };
    return { title: "Eco Sprout", level: 1, color: "text-slate-500", bg: "bg-slate-50" };
  }, [user]);

  const badges = useMemo(() => {
    const items = user?.total_items_saved || 0;
    const list = [
      { id: 'first', icon: Star, label: 'Early Bird', unlocked: true, color: 'text-amber-400' },
      { id: 'saver', icon: ShieldCheck, label: 'Waste Ninja', unlocked: items >= 5, color: 'text-emerald-500' },
      { id: 'planet', icon: Zap, label: 'Carbon Hero', unlocked: items >= 15, color: 'text-blue-500' },
      { id: 'top', icon: Trophy, label: 'Eco Elite', unlocked: items >= 30, color: 'text-purple-500' },
    ];
    return list;
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Please log in to view your profile.</p>
        <Link href="/auth?role=customer&tab=login" className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold">
          Sign In
        </Link>
      </div>
    );
  }

  const initial = user.name ? user.name[0].toUpperCase() : "C";

  return (
    <div className="min-h-screen bg-[#F4FBF7] dark:bg-gray-950 pb-24">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/95 backdrop-blur-md px-4 py-4 dark:text-white flex items-center border-b border-emerald-100/50 dark:border-gray-800">
        <h1 className="text-xl font-black tracking-tight ml-2">My Profile</h1>
      </header>

      <main className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
        
        {/* User Card */}
        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-6 shadow-sm border border-emerald-100/40 dark:border-gray-700 flex items-center gap-5">
          <div className="h-20 w-20 bg-emerald-500 text-white rounded-[1.5rem] flex items-center justify-center font-black text-3xl flex-shrink-0 shadow-lg shadow-emerald-500/20">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white truncate">{user.name}</h2>
              <Trophy size={20} className={userLevel.color} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
            <div className={`inline-flex items-center gap-1.5 mt-2 text-[10px] font-black uppercase tracking-widest ${userLevel.bg} ${userLevel.color} px-3 py-1 rounded-full border border-current/10`}>
              Level {userLevel.level}: {userLevel.title}
            </div>
          </div>
        </div>

        {/* Badges Section */}
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white mb-4 px-1">My Badges</h2>
          <div className="grid grid-cols-4 gap-4">
            {badges.map((badge) => (
              <motion.div
                key={badge.id}
                whileHover={badge.unlocked ? { scale: 1.05 } : {}}
                className={`flex flex-col items-center gap-2 ${badge.unlocked ? 'opacity-100' : 'opacity-30 grayscale'}`}
              >
                <div className={`w-14 h-14 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-emerald-100/40 flex items-center justify-center relative`}>
                  <badge.icon size={28} className={badge.unlocked ? badge.color : 'text-gray-400'} />
                  {badge.unlocked && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                      <Star size={8} className="text-white fill-white" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 text-center leading-tight">
                  {badge.label}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Impact Dashboard */}
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white mb-4 px-1">Sustainability Impact</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-600 text-white rounded-[2rem] p-5 shadow-xl shadow-emerald-500/20 flex flex-col items-center justify-center text-center">
                <Coins size={24} className="mb-2 opacity-80" />
                <span className="text-2xl font-black">₹{user.total_money_saved?.toFixed(0) || "0"}</span>
                <span className="text-[9px] font-bold opacity-80 uppercase tracking-widest">Total Saved</span>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-emerald-100/40 dark:border-gray-700 rounded-[2rem] p-5 shadow-sm flex flex-col items-center justify-center text-center">
                <PackageCheck size={24} className="mb-2 text-blue-500" />
                <span className="text-2xl font-black text-gray-900 dark:text-white">{user.total_items_saved || "0"}</span>
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Rescued</span>
              </div>

              <div className="bg-white dark:bg-gray-800 border border-emerald-100/40 dark:border-gray-700 rounded-[2rem] p-5 shadow-sm flex flex-col items-center justify-center text-center">
                <Leaf size={24} className="mb-2 text-emerald-500" />
                <span className="text-2xl font-black text-gray-900 dark:text-white">{user.co2_saved_kg?.toFixed(1) || "0"}</span>
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">kg CO₂</span>
              </div>
            </div>

            <ImpactTracker
              data={[1.2, 2.5, 1.8, 3.4, 4.2, 3.8, user.co2_saved_kg || 0]}
              label="CO2 Offset Progress (Weekly)"
              color="#10b981"
            />
          </div>
        </div>

        {/* Followed Shops */}
        {following.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3 px-1">Following Shops</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
              {following.map(f => (
                <div key={f.id} className="snap-start min-w-[140px] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-lg mb-2">
                    {f.shop.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white text-sm truncate w-full">{f.shop.name}</span>
                  <div className="text-[10px] text-gray-500 mt-1 flex items-center justify-center gap-1">
                    <Heart size={10} className="fill-emerald-500 text-emerald-500" /> Following
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Menu */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <Link href="/reservations" className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition border-b border-gray-100 dark:border-gray-700 text-left">
            <div className="flex items-center gap-4">
              <PackageCheck size={20} className="text-emerald-500" />
              <span className="font-semibold text-gray-900 dark:text-white">My Reservations</span>
            </div>
            <ChevronLeft size={16} className="rotate-180 text-gray-400" />
          </Link>
          <Link href="/notifications" className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition border-b border-gray-100 dark:border-gray-700 text-left">
            <div className="flex items-center gap-4">
              <Bell size={20} className="text-blue-500" />
              <span className="font-semibold text-gray-900 dark:text-white">Notifications</span>
            </div>
            <ChevronLeft size={16} className="rotate-180 text-gray-400" />
          </Link>
          <button className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition border-b border-gray-100 dark:border-gray-700 text-left">
            <div className="flex items-center gap-4">
              <Settings size={20} className="text-gray-500" />
              <span className="font-semibold text-gray-900 dark:text-white">Account Settings</span>
            </div>
            <ChevronLeft size={16} className="rotate-180 text-gray-400" />
          </button>
          
          <button 
            onClick={() => {
              logout();
              router.push('/');
            }}
            className="w-full flex items-center gap-4 px-6 py-4 hover:bg-red-50 dark:hover:bg-red-900/10 transition text-left"
          >
            <LogOut size={20} className="text-red-500" />
            <span className="font-semibold text-red-600">Log Out</span>
          </button>
        </div>

      </main>
      
      <BottomNav />
    </div>
  );
}
