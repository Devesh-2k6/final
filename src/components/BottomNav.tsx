"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tag, MapPin, Bell, User, ShieldCheck } from "lucide-react";

const NAV_ITEMS = [
  { href: "/deals", label: "Deals", icon: Tag },
  { href: "/map", label: "Map", icon: MapPin },
  { href: "/reservations", label: "Orders", icon: ShieldCheck },
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-6 inset-x-0 z-50 px-4 pointer-events-none flex justify-center">
      <nav className="bg-[#1A1A1A]/80 backdrop-blur-3xl border border-white/5 rounded-full py-1.5 px-3 shadow-[0_20px_40px_rgba(0,0,0,0.8)] pointer-events-auto flex items-center gap-1 max-w-lg w-full justify-between">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1.5 py-2 px-4 md:px-5 rounded-full transition-all duration-300 ${
                active
                  ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                  : "text-gray-400 hover:text-white border border-transparent"
              }`}
            >
              <div className="relative">
                <Icon
                  size={20}
                  className={`transition-transform duration-300 ${active ? "scale-110" : ""}`}
                />
              </div>
              <span className={`text-[9px] font-bold tracking-wider uppercase ${active ? "opacity-100" : "opacity-60"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
