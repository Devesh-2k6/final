"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Compass, ShoppingBag, User, Sparkles, Bell } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthenticationContext";
import { getMyNotifications } from "@/services/notifications";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  // Gap #21 — Fetch unread notification count
  useEffect(() => {
    if (!user) { setUnread(0); return; }
    const fetch = () => {
      getMyNotifications()
        .then((ns) => setUnread(ns.filter((n) => !n.is_read).length))
        .catch(() => {});
    };
    fetch();
    const id = setInterval(fetch, 30000);
    return () => clearInterval(id);
  }, [user]);

  const NAV_ITEMS = [
    { href: "/deals", label: "Deals", icon: Flame },
    { href: "/map", label: "Explore", icon: Compass },
    { href: "/pantry", label: "Fridge", icon: Sparkles },
    { href: "/reservations", label: "Cart / Pickups", icon: ShoppingBag },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="fixed bottom-6 inset-x-0 z-50 px-4 pointer-events-none flex justify-center lg:hidden">
      <nav className="bg-white/85 dark:bg-zinc-900/85 backdrop-blur-2xl border border-zinc-200/80 dark:border-zinc-800 rounded-full p-1.5 shadow-xl shadow-black/10 pointer-events-auto flex items-center gap-1 max-w-md w-full justify-between">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          const showBadge = href === "/notifications" && unread > 0;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 py-1.5 px-3.5 sm:px-4 rounded-full transition-all duration-200 ${
                active
                  ? "text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 font-semibold"
                  : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 border border-transparent font-medium"
              }`}
            >
              <div className="relative">
                <Icon
                  size={17}
                  className={`transition-transform duration-200 ${active ? "text-emerald-500 dark:text-emerald-400 scale-105" : ""}`}
                />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </div>
              <span className={`text-[9px] font-black tracking-wider uppercase ${active ? "opacity-100" : "opacity-70"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
