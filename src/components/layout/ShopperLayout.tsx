"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Flame,
  Compass,
  ShoppingBag,
  User,
  Sparkles,
  Bell,
  Leaf,
  LogOut,
  LogIn,
  Store,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthenticationContext";
import { BottomNav } from "@/components/BottomNav";

interface ShopperLayoutProps {
  children: React.ReactNode;
}

export function ShopperLayout({ children }: ShopperLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  const navigation = [
    { name: "Deals Feed", href: "/deals", icon: Flame },
    { name: "Explore Map", href: "/map", icon: Compass },
    { name: "Digital Fridge", href: "/pantry", icon: Sparkles },
    { name: "Cart & Pickups", href: "/reservations", icon: ShoppingBag },
    { name: "Notifications", href: "/notifications", icon: Bell },
    { name: "My Profile", href: "/profile", icon: User },
  ];

  const handleLogout = () => {
    logout();
    router.push("/auth?tab=login");
  };

  const displayName = user?.name ?? "Guest Shopper";
  const displayEmail = user?.email ?? "Sign in to save items";
  const initial = user?.name ? user.name[0].toUpperCase() : "?";

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-gray-950 text-slate-800 dark:text-gray-100 flex">
      {/* ── Desktop Sidebar (≥1024px) ── */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white dark:bg-gray-900 border-r border-orange-100/70 dark:border-gray-800 flex-shrink-0 sticky top-0 h-screen z-40">
        {/* Logo Branding */}
        <div className="h-16 flex items-center px-6 border-b border-orange-100/50 dark:border-gray-800">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="bg-[#FF5B26] p-1.5 rounded-xl text-white shadow-md shadow-orange-500/20">
              <Leaf size={20} className="fill-current" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Mee<span className="text-[#FF5B26]">va</span>
            </span>
          </Link>
        </div>

        {/* Navigation Menu */}
        <div className="p-4 flex-1 flex flex-col gap-1.5 overflow-y-auto">
          <div className="mb-2 px-3 text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest">
            Shopper Menu
          </div>
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-bold text-sm transition-all border ${
                  isActive
                    ? "bg-[#FFF0EB] dark:bg-orange-950/60 text-[#FF5B26] border-orange-200/80 dark:border-orange-500/30 shadow-xs"
                    : "text-slate-600 dark:text-gray-300 hover:text-[#FF5B26] dark:hover:text-[#FF5B26] border-transparent hover:bg-orange-50/50 dark:hover:bg-gray-800/60"
                }`}
              >
                <Icon
                  size={19}
                  className={
                    isActive
                      ? "text-[#FF5B26]"
                      : "text-slate-400 dark:text-gray-400"
                  }
                />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* Management Portals */}
          <div className="mt-4 pt-4 border-t border-orange-100/50 dark:border-gray-800">
            <div className="mb-2 px-3 text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest">
              Merchant & Partner
            </div>
            {user?.role === "VENDOR" || user?.is_shop_owner ? (
              <Link
                href="/shop"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-bold text-xs text-slate-500 dark:text-gray-400 hover:text-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-gray-800/60 transition-all border border-transparent"
              >
                <Store size={17} className="text-slate-400 dark:text-gray-500" />
                <span>Merchant Dashboard</span>
              </Link>
            ) : (
              <Link
                href="/shop/setup"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-bold text-xs text-slate-500 dark:text-gray-400 hover:text-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-gray-800/60 transition-all border border-transparent"
              >
                <Store size={17} className="text-slate-400 dark:text-gray-500" />
                <span>Register Store (Partner)</span>
              </Link>
            )}
            {user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-bold text-xs text-slate-500 dark:text-gray-400 hover:text-purple-600 hover:bg-purple-50/50 dark:hover:bg-gray-800/60 transition-all border border-transparent"
              >
                <ShieldCheck size={17} className="text-slate-400 dark:text-gray-500" />
                <span>Admin Console</span>
              </Link>
            )}
          </div>
        </div>

        {/* Sidebar Footer: User Card & Logout/Login */}
        <div className="p-4 border-t border-orange-100/50 dark:border-gray-800 bg-white/50 dark:bg-gray-950/40 space-y-3">
          {isAuthenticated && user ? (
            <>
              <div className="flex items-center gap-3 px-1">
                <div className="w-10 h-10 rounded-2xl bg-[#FF5B26]/10 text-[#FF5B26] border border-[#FF5B26]/20 flex items-center justify-center font-black text-sm flex-shrink-0">
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {displayName}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-gray-400 truncate">
                    {displayEmail}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/auth?tab=login"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#FF5B26] hover:bg-[#E54B18] text-white text-xs font-bold transition shadow-md shadow-orange-500/20"
            >
              <LogIn size={14} />
              Sign In / Register
            </Link>
          )}
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>

      {/* ── Mobile Bottom Navigation (<1024px) ── */}
      <BottomNav />
    </div>
  );
}
