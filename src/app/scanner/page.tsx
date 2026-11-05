"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Smartphone,
  QrCode,
  ScanLine,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  ExternalLink,
  RefreshCw,
  Zap,
  ArrowLeft,
  Package,
  Layers,
  Copy,
  Check,
  ShieldCheck,
  Radio,
  Clock,
  ChevronRight,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";

interface ScannedItem {
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

const DEMO_SAMPLES = [
  {
    code: "8901030895431",
    name: "Amul Taaza Homogenised Toned Milk 1L",
    brand: "Amul",
    category: "DAIRY",
    price: 54,
    icon: "🥛",
  },
  {
    code: "8901491101837",
    name: "Britannia 100% Whole Wheat Bread 400g",
    brand: "Britannia",
    category: "BAKERY",
    price: 45,
    icon: "🍞",
  },
  {
    code: "8901725181222",
    name: "Mother Dairy Classic Dahi 400g",
    brand: "Mother Dairy",
    category: "DAIRY",
    price: 35,
    icon: "🥣",
  },
  {
    code: "8901058852355",
    name: "Maggi 2-Minute Masala Instant Noodles 70g",
    brand: "Nestle",
    category: "GROCERY",
    price: 14,
    icon: "🍜",
  },
  {
    code: "8901058000404",
    name: "Nescafe Classic Pure Instant Coffee 100g",
    brand: "Nestle",
    category: "BEVERAGES",
    price: 340,
    icon: "☕",
  },
  {
    code: "EXPIRYGO:849201",
    name: "Customer Pickup Pass #849201",
    brand: "Counter Pickup",
    category: "OTHER",
    price: null,
    icon: "🏷️",
  },
];

export default function WebScannerHubPage() {
  const router = useRouter();
  const [activeScan, setActiveScan] = useState<ScannedItem | null>(null);
  const [scanHistory, setScanHistory] = useState<ScannedItem[]>([]);
  const [isListening, setIsListening] = useState(true);
  const [lastHeartbeat, setLastHeartbeat] = useState<number>(Date.now());
  const [broadcastingDemo, setBroadcastingDemo] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [manualVerifying, setManualVerifying] = useState(false);
  const [manualVerifyResult, setManualVerifyResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const lastTimestamp = useRef<number>(Date.now() - 30000);
  const [appUrl, setAppUrl] = useState("https://expirygo.vercel.app");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAppUrl(window.location.origin);
    }
  }, []);

  // Poll /api/scanner for real-time events from Expo Go Scanner
  useEffect(() => {
    let isMounted = true;

    const poll = async () => {
      try {
        const res = await fetch(`/api/scanner?since=${lastTimestamp.current}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          setLastHeartbeat(Date.now());
          if (data.scan && isMounted) {
            const scan = data.scan as ScannedItem;
            if (scan.timestamp > lastTimestamp.current) {
              lastTimestamp.current = scan.timestamp;
              setActiveScan(scan);
              setScanHistory((prev) => {
                const filtered = prev.filter((s) => s.id !== scan.id && s.barcode !== scan.barcode);
                return [scan, ...filtered].slice(0, 10);
              });
            }
          }
        }
      } catch {
        // silent network poll
      }
    };

    poll();
    const interval = setInterval(poll, 1600);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Broadcast a simulated scan to server so all clients see it
  const handleBroadcastSample = async (sample: (typeof DEMO_SAMPLES)[0]) => {
    setBroadcastingDemo(sample.code);
    try {
      const res = await fetch("/api/scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: sample.code,
          name: sample.name,
          brand: sample.brand,
          category: sample.category,
          suggested_price: sample.price,
          source: "web_demo_simulator",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.scan) {
          setActiveScan(data.scan);
          setScanHistory((prev) => [data.scan, ...prev.filter((p) => p.barcode !== data.scan.barcode)].slice(0, 10));
        }
      }
    } catch (err) {
      console.log("Demo broadcast error:", err);
    } finally {
      setTimeout(() => setBroadcastingDemo(null), 600);
    }
  };

  // Verify Pickup Code
  const handleVerifyPickup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualCode.trim()) return;
    setManualVerifying(true);
    setManualVerifyResult(null);

    try {
      const res = await fetch("/api/scanner/verify-pickup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: manualCode }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setManualVerifyResult({
          success: true,
          message: data.message || "Pickup verified successfully! Status marked as COMPLETED.",
        });
        setManualCode("");
      } else {
        setManualVerifyResult({
          success: false,
          message: data.detail || "Pickup code not found or already verified.",
        });
      }
    } catch (err: any) {
      setManualVerifyResult({
        success: false,
        message: err.message || "Failed to contact verification server.",
      });
    } finally {
      setManualVerifying(false);
    }
  };

  const handleCreateDealFromActive = () => {
    if (!activeScan) return;
    const params = new URLSearchParams();
    params.set("barcode", activeScan.barcode);
    if (activeScan.name) params.set("name", activeScan.name);
    if (activeScan.category) params.set("category", activeScan.category);
    if (activeScan.suggested_price) params.set("price", String(activeScan.suggested_price));
    if (activeScan.description) params.set("description", activeScan.description);
    router.push(`/shop/products/add?${params.toString()}`);
  };

  const handleSearchDealsFromActive = () => {
    if (!activeScan) return;
    const query = activeScan.name || activeScan.barcode;
    router.push(`/deals?q=${encodeURIComponent(query)}`);
  };

  const copyAppUrl = () => {
    navigator.clipboard.writeText(appUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white selection:bg-purple-500/30">
      {/* Background ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/15 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/deals"
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition"
              title="Back to Deals"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <ScanLine className="w-6 h-6 text-purple-400" />
                  Scanner & Expo Go Companion Hub
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-black uppercase tracking-wider">
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Real-time multi-device hardware scanner integration connecting Expo Go camera with Vercel web app.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-Time Stream Active</span>
            </div>
          </div>
        </div>

        {/* Main Grid: Live Sync Card + Phone Pairing QR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Active Live Scan Feed (8 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Live Card */}
            <div className="p-6 sm:p-7 rounded-3xl bg-zinc-900/80 border-2 border-purple-500/30 shadow-2xl shadow-purple-900/20 backdrop-blur-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Live Phone Scanner Feed</h2>
                    <p className="text-[11px] text-zinc-400">Listens for barcode and QR events from Expo Go camera</p>
                  </div>
                </div>

                {activeScan && (
                  <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    {new Date(activeScan.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>

              <AnimatePresence mode="wait">
                {activeScan ? (
                  <motion.div
                    key={activeScan.id}
                    initial={{ opacity: 0, y: 15, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="p-5 rounded-2xl bg-zinc-950/90 border border-purple-500/40 space-y-4 shadow-xl"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase">
                            {activeScan.is_pickup_verification ? "Pickup Pass" : activeScan.category || "Grocery"}
                          </span>
                          <span className="text-xs font-mono text-purple-300 font-bold">
                            {activeScan.barcode}
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-white">
                          {activeScan.name || `Scanned Item #${activeScan.barcode}`}
                        </h3>
                        {activeScan.brand && (
                          <p className="text-xs text-zinc-400 font-medium">Brand: {activeScan.brand}</p>
                        )}
                      </div>

                      {activeScan.suggested_price != null && (
                        <div className="text-right">
                          <span className="text-[10px] text-zinc-400 uppercase font-bold">Price</span>
                          <p className="text-xl font-black text-emerald-400 font-mono">
                            ₹{activeScan.suggested_price}
                          </p>
                        </div>
                      )}
                    </div>

                    {activeScan.description && (
                      <p className="text-xs text-zinc-300 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 leading-relaxed">
                        {activeScan.description}
                      </p>
                    )}

                    <div className="pt-2 flex flex-wrap items-center gap-2.5">
                      <button
                        onClick={handleCreateDealFromActive}
                        className="flex-1 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40 transition active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        Create Surplus Deal with This Item
                      </button>

                      <button
                        onClick={handleSearchDealsFromActive}
                        className="py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                      >
                        <Search className="w-4 h-4" />
                        Search Deals
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="py-12 px-4 rounded-2xl bg-zinc-950/50 border border-dashed border-zinc-800 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto border border-purple-500/20">
                      <Radio className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Waiting for Scans from Phone...</h3>
                      <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
                        Open ExpiryGo in Expo Go on your mobile phone and tap &quot;Scan Product Barcode&quot;. Point at any barcode or test below.
                      </p>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Quick Demo Simulator Barcodes */}
            <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Instant Presentation Simulator Chips
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Click any item to simulate an instant scan broadcast across Web and Expo Go:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {DEMO_SAMPLES.map((sample) => (
                  <button
                    key={sample.code}
                    onClick={() => handleBroadcastSample(sample)}
                    disabled={broadcastingDemo === sample.code}
                    className="p-3 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800/80 hover:border-purple-500/40 text-left transition flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg shrink-0">{sample.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-200 group-hover:text-white truncate">
                          {sample.name}
                        </p>
                        <p className="text-[10px] font-mono text-zinc-500">
                          {sample.code}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-purple-400 shrink-0 ml-2">
                      {broadcastingDemo === sample.code ? "Broadcasting..." : "Simulate →"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Scans List */}
            {scanHistory.length > 0 && (
              <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Recent Session Scans ({scanHistory.length})
                </h3>
                <div className="space-y-2">
                  {scanHistory.map((scan) => (
                    <div
                      key={scan.id}
                      className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-850 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{scan.name || scan.barcode}</p>
                        <p className="text-[10px] font-mono text-zinc-400">
                          {scan.barcode} • {scan.source || "expo_go"}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setActiveScan(scan);
                          handleCreateDealFromActive();
                        }}
                        className="py-1 px-2.5 rounded-lg bg-zinc-800 hover:bg-purple-600 text-zinc-200 hover:text-white text-[11px] font-semibold transition shrink-0"
                      >
                        Use in Deal
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Mobile Pairing QR & Pickup Pass Verifier (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Phone Pairing QR Card */}
            <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-5 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold">
                <QrCode className="w-3.5 h-3.5" />
                Scan to Open on Phone
              </div>

              <div>
                <h3 className="text-base font-black text-white">Live Phone Scanner Pairing</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Point your phone camera or Expo Go at this QR code to load the app directly:
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl inline-block shadow-xl shadow-black/40">
                <QRCodeSVG value={`${appUrl}?app=true`} size={180} />
              </div>

              <div className="space-y-2">
                <button
                  onClick={copyAppUrl}
                  className="w-full py-2.5 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 text-xs font-semibold text-zinc-300 flex items-center justify-center gap-2 transition"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedUrl ? "URL Copied to Clipboard!" : "Copy Production URL"}
                </button>
                <p className="text-[10px] font-mono text-zinc-500 truncate">{appUrl}</p>
              </div>
            </div>

            {/* Instant Store Pickup QR Verifier */}
            <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Store Counter Pickup Verifier</h3>
              </div>
              <p className="text-xs text-zinc-400">
                Verify customer 6-character pickup codes (or scan customer QR pass) to confirm item handover:
              </p>

              <form onSubmit={handleVerifyPickup} className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter 6-digit code (e.g. 849201)"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    maxLength={10}
                    className="w-full py-3 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-white font-mono uppercase tracking-widest text-center text-sm font-bold focus:border-emerald-500 focus:outline-none transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={manualVerifying || !manualCode.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
                >
                  {manualVerifying ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Verify Pickup Pass
                </button>
              </form>

              {manualVerifyResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs ${
                    manualVerifyResult.success
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-red-500/10 border-red-500/30 text-red-300"
                  }`}
                >
                  <p className="font-semibold">{manualVerifyResult.message}</p>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
