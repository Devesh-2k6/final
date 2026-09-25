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
    <div className="min-h-screen bg-[#FAFAFC] dark:bg-[#0B0F17] text-zinc-900 dark:text-zinc-100 flex">
      {/* ── Desktop Sidebar (≥1024px) ── */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white dark:bg-[#0F141F] border-r border-zinc-200/70 dark:border-zinc-800/80 flex-shrink-0 sticky top-0 h-screen z-40">
        {/* Logo Branding */}
        <div className="h-16 flex items-center px-6 border-b border-zinc-200/70 dark:border-zinc-800/80">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-sm shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Leaf size={16} className="fill-white" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">
                Meeva
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/40 px-1.5 py-0.5 rounded-md">
                Food
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Menu */}
        <div className="p-3.5 flex-1 flex flex-col gap-1 overflow-y-auto">
          <div className="mb-2 px-3 pt-2 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
            Menu
          </div>
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all ${
                  isActive
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                }`}
              >
                <Icon
                  size={17}
                  className={
                    isActive
                      ? "text-emerald-400 dark:text-emerald-600"
                      : "text-zinc-400 dark:text-zinc-500"
                  }
                />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* Management Portals */}
          <div className="mt-4 pt-4 border-t border-zinc-200/70 dark:border-zinc-800/80">
            <div className="mb-2 px-3 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
              Partners & Admin
            </div>
            {user?.role === "VENDOR" || user?.is_shop_owner ? (
              <Link
                href="/shop"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 transition-all"
              >
                <Store size={16} className="text-zinc-400" />
                <span>Merchant Dashboard</span>
              </Link>
            ) : (
              <Link
                href="/shop/setup"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 transition-all"
              >
                <Store size={16} className="text-zinc-400" />
                <span>Register Store (Partner)</span>
              </Link>
            )}
            {user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs text-zinc-600 dark:text-zinc-400 hover:text-purple-600 hover:bg-purple-50/60 dark:hover:bg-purple-950/30 transition-all"
              >
                <ShieldCheck size={16} className="text-zinc-400" />
                <span>Admin Console</span>
              </Link>
            )}
          </div>
        </div>

        {/* Sidebar Footer: User Card & Logout/Login */}
        <div className="p-3.5 border-t border-zinc-200/70 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-2.5">
          {isAuthenticated && user ? (
            <>
              <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-500/20">
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                    {displayName}
                  </p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                    {displayEmail}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-zinc-500 hover:text-red-600 dark:hover:text-red-400 text-xs font-semibold transition cursor-pointer"
              >
                <LogOut size={13} />
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/auth?tab=login"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition shadow-sm"
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
