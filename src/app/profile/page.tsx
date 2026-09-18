"use client";

import { Heart, Bell, Settings, ChevronLeft, LogOut, PackageCheck, Leaf, Coins, Trophy, Star, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthenticationContext";
import { ShopperLayout } from "@/components/layout/ShopperLayout";
import { getMyFollowing } from "@/services/shops";
import type { ApiFollower } from "@/types/product";
import { motion } from "framer-motion";
import { ImpactTracker } from "@/components/ImpactTracker";
import { ScrollToTop } from "@/components/ui/ScrollToTop";
import { useToast } from "@/components/ui/Toast";
import { apiRequest } from "@/api/client";

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [following, setFollowing] = useState<ApiFollower[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const handleOpenEdit = () => {
    setEditName(user?.name || "");
    setEditPhone(user?.phone_number || "");
    setEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setSavingEdit(true);
    try {
      await apiRequest("/users/me", { method: "PATCH", json: { name: editName.trim(), phone_number: editPhone.trim() || undefined } });
      await refreshUser();
      toast.success("Profile updated!", "Your changes have been saved.");
      setEditOpen(false);
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setSavingEdit(false);
    }
  };

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
    <ShopperLayout>
      <div className="min-h-screen bg-[#F4FBF7] dark:bg-gray-950 pb-24">
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/95 backdrop-blur-md px-4 lg:px-8 py-4 dark:text-white flex items-center border-b border-emerald-100/50 dark:border-gray-800">
          <div className="w-full max-w-2xl lg:max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black tracking-tight">My Profile</h1>
              <p className="text-xs text-slate-400 hidden sm:block">View personal stats, badges and waste reduction impact</p>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 w-full max-w-2xl lg:max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: User Card, Badges & Menu */}
            <div className="lg:col-span-1 space-y-6">
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
                  <button
                    onClick={handleOpenEdit}
                    className="mt-3 flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition"
                  >
                    ✏️ Edit Profile
                  </button>
                </div>
              </div>

              {/* Badges Section */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-emerald-100/40 dark:border-gray-700">
                <h2 className="text-base font-black text-gray-900 dark:text-white mb-4">My Badges</h2>
                <div className="grid grid-cols-4 gap-3">
                  {badges.map((badge) => (
                    <motion.div
                      key={badge.id}
                      whileHover={badge.unlocked ? { scale: 1.05 } : {}}
                      className={`flex flex-col items-center gap-2 ${badge.unlocked ? 'opacity-100' : 'opacity-30 grayscale'}`}
                    >
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-50 dark:bg-gray-900 shadow-sm border border-emerald-100/40 dark:border-gray-700 flex items-center justify-center relative`}>
                        <badge.icon size={24} className={badge.unlocked ? badge.color : 'text-gray-400'} />
                        {badge.unlocked && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
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

              {/* Menu Actions */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <Link href="/reservations" className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition border-b border-gray-100 dark:border-gray-700 text-left">
                  <div className="flex items-center gap-4">
                    <PackageCheck size={20} className="text-emerald-500" />
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">My Reservations</span>
                  </div>
                  <ChevronLeft size={16} className="rotate-180 text-gray-400" />
                </Link>
                <Link href="/notifications" className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition border-b border-gray-100 dark:border-gray-700 text-left">
                  <div className="flex items-center gap-4">
                    <Bell size={20} className="text-blue-500" />
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">Notifications</span>
                  </div>
                  <ChevronLeft size={16} className="rotate-180 text-gray-400" />
                </Link>
                <button 
                  onClick={() => {
                    logout();
                    router.push('/');
                  }}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-red-50 dark:hover:bg-red-900/10 transition text-left cursor-pointer"
                >
                  <LogOut size={20} className="text-red-500" />
                  <span className="font-semibold text-red-600 text-sm">Log Out</span>
                </button>
              </div>
            </div>

            {/* Right Column: Sustainability Impact & Following */}
            <div className="lg:col-span-2 space-y-6">
              {/* Impact Dashboard */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-emerald-100/40 dark:border-gray-700">
                <h2 className="text-base font-black text-gray-900 dark:text-white mb-4">Sustainability Impact</h2>
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-600 text-white rounded-2xl p-4 sm:p-5 shadow-lg shadow-emerald-500/20 flex flex-col items-center justify-center text-center">
                      <Coins size={22} className="mb-1.5 opacity-80" />
                      <span className="text-xl sm:text-2xl font-black">₹{user.total_money_saved?.toFixed(0) || "0"}</span>
                      <span className="text-[9px] font-bold opacity-80 uppercase tracking-widest">Total Saved</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-gray-900 border border-emerald-100/40 dark:border-gray-700 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col items-center justify-center text-center">
                      <PackageCheck size={22} className="mb-1.5 text-blue-500" />
                      <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{user.total_items_saved || "0"}</span>
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Rescued</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-gray-900 border border-emerald-100/40 dark:border-gray-700 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col items-center justify-center text-center">
                      <Leaf size={22} className="mb-1.5 text-emerald-500" />
                      <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{user.co2_saved_kg?.toFixed(1) || "0"}</span>
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">kg CO₂</span>
                    </div>
                  </div>

                  <ImpactTracker
                    data={user.co2_saved_kg && user.co2_saved_kg > 0 ? [0, 0, 0, 0, 0, 0, user.co2_saved_kg] : [0, 0, 0, 0, 0, 0, 0]}
                    label="CO2 Offset Progress (Weekly)"
                    color="#10b981"
                  />
                </div>
              </div>

              {/* Followed Shops */}
              {following.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Following Shops</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {following.map(f => (
                      <div key={f.id} className="bg-slate-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-lg mb-2">
                          {f.shop.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white text-xs truncate w-full">{f.shop.name}</span>
                        <div className="text-[10px] text-gray-500 mt-1 flex items-center justify-center gap-1">
                          <Heart size={10} className="fill-emerald-500 text-emerald-500" /> Following
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
      <ScrollToTop />

      {/* Gap #8 — Edit Profile Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">Edit Profile</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Name</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} className="mt-1 w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500" required />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Phone Number</label>
                <input value={editPhone} onChange={e => setEditPhone(e.target.value)} type="tel" className="mt-1 w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500" placeholder="+91 XXXXX XXXXX" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditOpen(false)} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition">Cancel</button>
                <button type="submit" disabled={savingEdit} className="flex-1 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition disabled:opacity-60">{savingEdit ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ShopperLayout>
  );
}
