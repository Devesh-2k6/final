"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Smartphone,
  QrCode,
  Download,
  Wifi,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Zap,
  Layers,
  ArrowLeft,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { getPublicApiBaseUrl } from "@/config/env";
import { createProduct } from "@/services/products";

export default function MobileHubPage() {
  const [activeTab, setActiveTab] = useState<"expogo" | "apk" | "sync">("expogo");
  const [hostIp, setHostIp] = useState<string>("192.168.1.4");
  const [expoPort, setExpoPort] = useState<string>("8081");
  const [copied, setCopied] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState<"lan" | "tunnel" | "custom">("lan");
  const [customTunnelUrl, setCustomTunnelUrl] = useState<string>("");

  // Diagnostics
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");
  const [apiLatency, setApiLatency] = useState<number | null>(null);

  // Live Sync Test State
  const [syncTesting, setSyncTesting] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    productName?: string;
    message: string;
    timestamp: string;
  } | null>(null);

  const checkHealthAndNetwork = async () => {
    setApiStatus("checking");
    const start = performance.now();
    try {
      const apiBase = getPublicApiBaseUrl();
      const res = await fetch(`${apiBase}/health/network`, { method: "GET", signal: AbortSignal.timeout(3500) });
      const elapsed = Math.round(performance.now() - start);
      if (res.ok) {
        const netData = await res.json();
        setApiStatus("online");
        setApiLatency(elapsed);
        if (netData.lan_ip && netData.lan_ip !== "127.0.0.1" && connectionMode === "lan") {
          setHostIp(netData.lan_ip);
        }
      } else {
        // Fallback to basic /health
        const res2 = await fetch(`${apiBase}/health`, { method: "GET", signal: AbortSignal.timeout(2000) });
        if (res2.ok) {
          setApiStatus("online");
          setApiLatency(elapsed);
        } else {
          setApiStatus("offline");
        }
      }
    } catch {
      setApiStatus("offline");
      setApiLatency(null);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
        setHostIp(hostname);
      }
    }
    checkHealthAndNetwork();
  }, []);

  const expoUri = connectionMode === "tunnel" && customTunnelUrl
    ? customTunnelUrl
    : `exp://${hostIp}:${expoPort}`;
  const expoWebUrl = `http://${hostIp}:${expoPort}`;
  const apiBaseUrl = `http://${hostIp}:8000`;
  const webAppUrl = `http://${hostIp}:3000`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const triggerSyncTest = async () => {
    setSyncTesting(true);
    setSyncResult(null);
    try {
      const testName = `⚡ Live Sync Deal ${Math.floor(Math.random() * 900 + 100)}`;
      const mfg = new Date();
      const exp = new Date();
      exp.setDate(exp.getDate() + 3);

      const created = await createProduct({
        name: testName,
        original_price: 199,
        discount_price: 79,
        quantity: 15,
        manufacturing_date: mfg.toISOString(),
        expiry_date: exp.toISOString(),
        category: "PRODUCE",
        description: "Fresh harvest deal verified and synchronized live across Web & Mobile clients.",
        front_image_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
        is_active: true,
      });

      setSyncResult({
        success: true,
        productName: created.name,
        message: `Deal created & broadcasted over WebSocket to all Web & Expo Go clients!`,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err?.message || "Failed to broadcast sync deal. Ensure backend is running.",
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setSyncTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0f12] text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header / Nav */}
        <div className="flex items-center justify-between">
          <Link
            href="/deals"
            className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition py-2 px-3 bg-zinc-900 rounded-xl border border-zinc-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Web App
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
            <span className="text-xs font-mono text-emerald-400">Wi-Fi: {hostIp}</span>
          </div>
        </div>

        {/* Hero Title */}
        <div className="p-8 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-3">
                <Smartphone className="w-3.5 h-3.5" />
                MEEVA UNIFIED ECOSYSTEM
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Mobile App & Scanner Hub
              </h1>
              <p className="text-sm text-zinc-400 mt-2 max-w-xl">
                Experience Meeva as a real native application on your phone. Test with Expo Go or download standalone APK with 100% live synchronization.
              </p>
            </div>
            
            {/* Quick Stats Pill */}
            <div className="flex flex-col gap-2 p-4 bg-zinc-950/80 rounded-2xl border border-zinc-800 text-xs shrink-0">
              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-400">API Status:</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  {apiStatus === "online" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-400" />}
                  {apiStatus === "online" ? `Online (${apiLatency}ms)` : apiStatus}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-400">Expo Metro:</span>
                <span className="font-mono text-zinc-300">:{expoPort}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/50 rounded-2xl p-1.5 gap-2 border">
          <button
            onClick={() => setActiveTab("expogo")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition ${
              activeTab === "expogo"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/30"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <QrCode className="w-4 h-4" />
            Expo Go Scanner
          </button>
          <button
            onClick={() => setActiveTab("apk")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition ${
              activeTab === "apk"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/30"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Download className="w-4 h-4" />
            Download APK / Build
          </button>
          <button
            onClick={() => setActiveTab("sync")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold transition ${
              activeTab === "sync"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/30"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Zap className="w-4 h-4" />
            Real-Time Sync Lab
          </button>
        </div>

        {/* Tab 1: Expo Go Scanner */}
        {activeTab === "expogo" && (
          <div className="space-y-6">
            {/* Mode Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-zinc-900/80 rounded-2xl border border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-400">Connection Mode:</span>
                <div className="flex rounded-xl bg-zinc-950 p-1 border border-zinc-800 gap-1">
                  <button
                    onClick={() => {
                      setConnectionMode("lan");
                      checkHealthAndNetwork();
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      connectionMode === "lan"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Wi-Fi / LAN
                  </button>
                  <button
                    onClick={() => {
                      setConnectionMode("tunnel");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      connectionMode === "tunnel"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Tunnel (Cloud)
                  </button>
                </div>
              </div>

              {/* IP Input / Refresh */}
              <div className="flex items-center gap-2">
                {connectionMode === "lan" ? (
                  <div className="flex items-center gap-1.5 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800">
                    <span className="text-xs text-zinc-500 font-mono">IP:</span>
                    <input
                      type="text"
                      value={hostIp}
                      onChange={(e) => setHostIp(e.target.value)}
                      className="bg-transparent text-xs font-mono text-emerald-400 focus:outline-none w-28"
                    />
                    <button
                      onClick={checkHealthAndNetwork}
                      title="Auto-detect network IP"
                      className="text-zinc-400 hover:text-emerald-400 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800">
                    <input
                      type="text"
                      placeholder="exp://xxxx.exp.direct:80"
                      value={customTunnelUrl}
                      onChange={(e) => setCustomTunnelUrl(e.target.value)}
                      className="bg-transparent text-xs font-mono text-emerald-400 focus:outline-none w-48"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center bg-zinc-900/60 p-6 sm:p-8 rounded-3xl border border-zinc-800">
              {/* QR Card */}
              <div className="flex flex-col items-center justify-center p-6 bg-zinc-950 rounded-2xl border border-zinc-800 shadow-xl text-center">
                <div className="p-4 bg-white rounded-2xl shadow-2xl">
                  <QRCodeSVG
                    value={expoUri}
                    size={210}
                    level="M"
                    includeMargin={false}
                    bgColor="#FFFFFF"
                    fgColor="#09090B"
                  />
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400 font-mono font-semibold bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/30 max-w-full truncate">
                  <Wifi className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{expoUri}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(expoUri, "expouri")}
                  className="mt-3 text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition"
                >
                  {copied === "expouri" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === "expouri" ? "Copied exp:// URI!" : "Copy Expo URI"}
                </button>
              </div>

              {/* Steps */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
                  3-Step Instant Setup:
                </h3>
                
                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-3 p-3.5 bg-zinc-950/60 rounded-xl border border-zinc-800">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                      1
                    </span>
                    <div>
                      <p className="font-semibold text-white">Install Expo Go</p>
                      <p className="text-zinc-400 text-[11px]">Free on Google Play Store (Android) or Apple App Store (iOS).</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 bg-zinc-950/60 rounded-xl border border-zinc-800">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                      2
                    </span>
                    <div>
                      <p className="font-semibold text-white">Connect Phone to Same Wi-Fi</p>
                      <p className="text-zinc-400 text-[11px]">Make sure your phone is connected to the same Wi-Fi network (<span className="text-emerald-400 font-mono">{hostIp}</span>).</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 bg-zinc-950/60 rounded-xl border border-zinc-800">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                      3
                    </span>
                    <div>
                      <p className="font-semibold text-white">Scan the QR Code</p>
                      <p className="text-zinc-400 text-[11px]">Open Expo Go and tap <strong>Scan QR code</strong> (or use iOS Camera app).</p>
                    </div>
                  </div>
                </div>

                <a
                  href={expoWebUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 transition"
                >
                  <ExternalLink className="w-4 h-4 text-emerald-400" />
                  Launch Mobile Web in Browser ({expoWebUrl})
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: APK Download */}
        {activeTab === "apk" && (
          <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-6">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
              <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-400" />
                Standalone Android APK Generation
              </h4>
              <p className="text-xs text-zinc-300 mt-1">
                You can generate a direct installable <strong>.apk</strong> file using Expo EAS build without needing heavy build tools.
              </p>
            </div>

            <div className="space-y-4">
              <h5 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                EAS Preview Build Command:
              </h5>
              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Run from project root:</span>
                  <button
                    onClick={() => copyToClipboard("cd mobile && npx eas-cli build -p android --profile preview", "eascmd2")}
                    className="text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    {copied === "eascmd2" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy Command
                  </button>
                </div>
                <pre className="p-3 bg-zinc-900 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto">
                  cd mobile && npx eas-cli build -p android --profile preview
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Real-Time Sync Lab */}
        {activeTab === "sync" && (
          <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                <p className="text-xs text-zinc-400">FastAPI Server</p>
                <p className="text-lg font-bold font-mono text-white mt-1">:8000</p>
                <p className="text-xs text-emerald-400 mt-1">{apiStatus === "online" ? `Online (${apiLatency}ms)` : apiStatus}</p>
              </div>
              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                <p className="text-xs text-zinc-400">Next.js Web</p>
                <p className="text-lg font-bold font-mono text-white mt-1">:3000</p>
                <p className="text-xs text-emerald-400 mt-1">Active</p>
              </div>
              <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                <p className="text-xs text-zinc-400">Expo Metro</p>
                <p className="text-lg font-bold font-mono text-white mt-1">:{expoPort}</p>
                <p className="text-xs text-emerald-400 mt-1">Broadcasting</p>
              </div>
            </div>

            <div className="p-6 bg-zinc-950 rounded-2xl border border-emerald-500/20 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Live Sync Broadcast Tester
              </h4>
              <p className="text-xs text-zinc-400">
                Clicking this button will create a deal in the backend and broadcast it via WebSocket. Watch it instantly appear in both your web browser and your mobile phone!
              </p>

              <button
                onClick={triggerSyncTest}
                disabled={syncTesting}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition"
              >
                {syncTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Trigger Real-Time Deal Sync Event
              </button>

              {syncResult && (
                <div
                  className={`p-4 rounded-xl border text-xs ${
                    syncResult.success
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-red-500/10 border-red-500/30 text-red-300"
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    {syncResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                    {syncResult.productName || "Sync Event"}
                    <span className="text-[10px] text-zinc-400 font-mono ml-auto">{syncResult.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-1">{syncResult.message}</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
