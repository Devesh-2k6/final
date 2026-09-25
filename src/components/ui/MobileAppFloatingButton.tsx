"use client";

import React, { useState } from "react";
import { Smartphone, QrCode } from "lucide-react";
import { MobileConnectModal } from "./MobileConnectModal";

export function MobileAppFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-20 lg:bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2 px-3.5 py-2 bg-zinc-900/85 hover:bg-zinc-900 border border-zinc-700/80 hover:border-emerald-500/50 text-white rounded-full shadow-lg shadow-black/25 backdrop-blur-xl transition-all cursor-pointer hover:scale-102 active:scale-98"
          title="Connect Mobile App (Expo Go / Scanner / APK)"
        >
          {/* Animated ping dot */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>

          <Smartphone className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-6 transition-transform" />
          <span className="text-[11px] font-semibold tracking-tight">
            Mobile App
          </span>
          <QrCode className="w-3 h-3 text-zinc-400 group-hover:text-emerald-300" />
        </button>
      </div>

      <MobileConnectModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
