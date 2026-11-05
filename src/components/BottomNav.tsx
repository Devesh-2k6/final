"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Compass, ShoppingBag, User, Sparkles, Bell, QrCode } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthenticationContext";
import { getMyNotifications } from "@/services/notifications";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  // Gap #21 — Fetch unread notification count (paused when tab hidden for smoothness)
  useEffect(() => {
    if (!user) { setUnread(0); return; }
    const fetchNotifications = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      getMyNotifications()
        .then((ns) => setUnread(ns.filter((n) => !n.is_read).length))
        .catch(() => {});
    };
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30000);
    return () => clearInterval(id);
  }, [user]);

  const NAV_ITEMS = [
    { href: "/deals", label: "Deals", icon: Flame },
    { href: "/map", label: "Explore", icon: Compass },
    { href: "/scanner", label: "Scanner", icon: QrCode },
    { href: "/pantry", label: "Fridge", icon: Sparkles },
    { href: "/reservations", label: "Pickups", icon: ShoppingBag },
  ];

  return (
    <div className="fixed bottom-6 inset-x-0 z-50 px-4 pointer-events-none flex justify-center lg:hidden">
      <nav className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl border border-zinc-200/80 dark:border-zinc-800 rounded-full p-1.5 shadow-xl shadow-purple-900/10 pointer-events-auto flex items-center gap-1 max-w-md w-full justify-between">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          const showBadge = href === "/notifications" && unread > 0;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 py-1.5 px-3.5 sm:px-4 rounded-full transition-all duration-200 active:scale-95 touch-manipulation ${
                active
                  ? "text-purple-950 dark:text-white bg-purple-50 dark:bg-purple-950/50 border border-purple-200/80 dark:border-purple-800/60 font-semibold shadow-xs"
                  : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 border border-transparent font-medium"
              }`}
            >
              <div className="relative">
                <Icon
                  size={17}
                  className={`transition-transform duration-200 ${active ? "text-purple-600 dark:text-purple-400 scale-110" : ""}`}
                />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </div>
              <span className={`text-[9px] font-black tracking-wider uppercase ${active ? "text-purple-700 dark:text-purple-300 opacity-100" : "opacity-70"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
