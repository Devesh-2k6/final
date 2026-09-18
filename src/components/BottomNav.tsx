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
      <nav className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl border border-orange-100/80 dark:border-gray-800 rounded-full p-2 shadow-[0_15px_35px_rgba(255,91,38,0.08)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.7)] pointer-events-auto flex items-center gap-1.5 max-w-lg w-full justify-between">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          const showBadge = href === "/notifications" && unread > 0;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 py-2 px-3.5 sm:px-5 rounded-full transition-all duration-300 ${
                active
                  ? "text-[#FF5B26] bg-[#FFF0EB] dark:bg-orange-950/60 border border-orange-200/60 dark:border-orange-500/20 shadow-md shadow-orange-500/10 scale-105"
                  : "text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white border border-transparent hover:bg-slate-100/50 dark:hover:bg-gray-800/50"
              }`}
            >
              <div className="relative">
                <Icon
                  size={19}
                  className={`transition-transform duration-300 ${active ? "scale-110" : ""}`}
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
