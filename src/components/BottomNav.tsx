"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Compass, ShoppingBag, User, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const NAV_ITEMS = [
    { href: "/deals", label: "Deals", icon: Flame },
    { href: "/map", label: "Explore", icon: Compass },
    { href: "/pantry", label: "Fridge", icon: Sparkles },
    { href: "/reservations", label: "Cart / Pickups", icon: ShoppingBag },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="fixed bottom-6 inset-x-0 z-50 px-4 pointer-events-none flex justify-center">
      <nav className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl border border-orange-100/80 dark:border-gray-800 rounded-full p-2 shadow-[0_15px_35px_rgba(255,91,38,0.08)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.7)] pointer-events-auto flex items-center gap-1.5 max-w-lg w-full justify-between">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
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
