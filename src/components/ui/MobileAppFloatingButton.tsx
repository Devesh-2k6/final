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
          className="group relative flex items-center gap-2.5 px-4 py-2.5 bg-zinc-900/90 hover:bg-zinc-800 border border-emerald-500/40 hover:border-emerald-400 text-white rounded-2xl shadow-xl shadow-black/60 backdrop-blur-md transition-all hover:scale-105 active:scale-95"
          title="Connect Mobile App (Expo Go / Scanner / APK)"
        >
          {/* Animated ping dot */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>

          <Smartphone className="w-4 h-4 text-emerald-400 group-hover:rotate-12 transition-transform" />
          <span className="text-xs font-bold tracking-tight">
            Mobile App & QR
          </span>
          <QrCode className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-300" />
        </button>
      </div>

      <MobileConnectModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
