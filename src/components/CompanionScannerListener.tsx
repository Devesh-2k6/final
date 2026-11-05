"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { QrCode, Smartphone, Sparkles, X, Plus, Search, ExternalLink, Check, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface ScannedItem {
  id: string;
  barcode: string;
  name?: string | null;
  brand?: string | null;
  category?: string | null;
  description?: string | null;
  suggested_price?: number | null;
  image_url?: string | null;
  timestamp: number;
  source?: string;
  is_pickup_verification?: boolean;
  pickup_status?: string;
}

export function CompanionScannerListener() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeScan, setActiveScan] = useState<ScannedItem | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const lastTimestamp = useRef<number>(Date.now() - 10000); // only scans from now onwards
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Poll /api/scanner for events from Expo Go Scanner
  useEffect(() => {
    let isMounted = true;

    const poll = async () => {
      try {
        const res = await fetch(`/api/scanner?since=${lastTimestamp.current}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          if (data.scan && isMounted) {
            const scan = data.scan as ScannedItem;
            if (!dismissedIds.has(scan.id)) {
              lastTimestamp.current = scan.timestamp;
              setActiveScan(scan);

              // Broadcast DOM custom event so active pages (like /shop/products/add or /reservations) can react
              window.dispatchEvent(
                new CustomEvent("EXPIRYGO_SCANNER_EVENT", {
                  detail: scan,
                })
              );

              // Auto-dismiss notification toast after 14 seconds
              if (dismissTimer.current) clearTimeout(dismissTimer.current);
              dismissTimer.current = setTimeout(() => {
                if (isMounted) setActiveScan(null);
              }, 14000);
            }
          }
        }
      } catch {
        // silent
      }
    };

    poll();
    const interval = setInterval(poll, 1800);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [dismissedIds]);

  // Listen for postMessage from React Native WebView (when viewed inside the mobile app's WebView)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data && (data.type === "EXPIRYGO_SCANNER_EVENT" || data.type === "EXPIRYGO_BARCODE_SCANNED")) {
          const scanItem: ScannedItem = {
            id: `webview_${Date.now()}`,
            barcode: data.barcode || data.code,
            name: data.name || data.product?.name,
            brand: data.brand || data.product?.brand,
            category: data.category || data.product?.category,
            description: data.description || data.product?.description,
            suggested_price: data.suggested_price || data.product?.suggested_price,
            image_url: data.image_url || data.product?.image_url,
            timestamp: Date.now(),
            source: "mobile_webview",
            is_pickup_verification: data.is_pickup_verification,
            pickup_status: data.pickup_status,
          };
          setActiveScan(scanItem);
          window.dispatchEvent(
            new CustomEvent("EXPIRYGO_SCANNER_EVENT", {
              detail: scanItem,
            })
          );
        }
      } catch {}
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleDismiss = () => {
    if (activeScan) {
      setDismissedIds((prev) => new Set([...prev, activeScan.id]));
      setActiveScan(null);
    }
  };

  const handleCreateDeal = () => {
    if (!activeScan) return;
    const params = new URLSearchParams();
    params.set("barcode", activeScan.barcode);
    if (activeScan.name) params.set("name", activeScan.name);
    if (activeScan.category) params.set("category", activeScan.category);
    if (activeScan.suggested_price) params.set("price", String(activeScan.suggested_price));
    if (activeScan.description) params.set("description", activeScan.description);
    handleDismiss();
    router.push(`/shop/products/add?${params.toString()}`);
  };

  const handleSearchDeals = () => {
    if (!activeScan) return;
    const query = activeScan.name || activeScan.barcode;
    handleDismiss();
    router.push(`/deals?q=${encodeURIComponent(query)}`);
  };

  // If already on /scanner page, the page itself handles rendering
  if (!activeScan || pathname === "/scanner") return null;

  const isAlreadyOnAddPage = pathname === "/shop/products/add";
  const isPickupPass = activeScan.is_pickup_verification;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[99999] max-w-sm w-[calc(100vw-2rem)] bg-white dark:bg-zinc-900 border-2 border-emerald-500/40 rounded-2xl p-4 shadow-2xl shadow-emerald-500/20 backdrop-blur-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              {isPickupPass ? (
                <ShieldCheck className="w-5 h-5 text-emerald-500 animate-pulse" />
              ) : (
                <Smartphone className="w-5 h-5 animate-pulse" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {isPickupPass ? "✅ Pickup QR Verified" : "📱 Expo Go Scanner Synced"}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white line-clamp-1">
                {activeScan.name || `Code: ${activeScan.barcode}`}
              </h4>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shrink-0 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-2.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl p-2.5 border border-zinc-200/60 dark:border-zinc-700/60 text-xs text-zinc-600 dark:text-zinc-300 space-y-1">
          <div className="flex items-center justify-between font-mono">
            <span className="text-zinc-400">Code / Barcode:</span>
            <span className="font-bold text-zinc-800 dark:text-zinc-100">{activeScan.barcode}</span>
          </div>
          {activeScan.brand && (
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Brand:</span>
              <span className="font-medium text-zinc-700 dark:text-zinc-200">{activeScan.brand}</span>
            </div>
          )}
          {activeScan.category && (
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Category:</span>
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                {activeScan.category}
              </span>
            </div>
          )}
          {isAlreadyOnAddPage && !isPickupPass && (
            <div className="pt-1 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
              <Check className="w-3.5 h-3.5" />
              Auto-filled into Add Product form!
            </div>
          )}
          {isPickupPass && (
            <div className="pt-1 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
              <Check className="w-3.5 h-3.5" />
              Customer handover completed & status synchronized!
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          {isPickupPass ? (
            <button
              onClick={() => {
                handleDismiss();
                router.push("/reservations");
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Pickups
            </button>
          ) : (
            <>
              {!isAlreadyOnAddPage && (
                <button
                  onClick={handleCreateDeal}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add as Surplus Deal
                </button>
              )}
              <button
                onClick={handleSearchDeals}
                className={`py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  isAlreadyOnAddPage ? "flex-1 bg-zinc-100 dark:bg-zinc-800" : ""
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                Search Deals
              </button>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
