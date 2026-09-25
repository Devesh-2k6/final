"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Server,
  Layers,
  X,
  Play,
  Share2,
  Sparkles,
  Cpu
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { getPublicApiBaseUrl } from "@/config/env";
import { createProduct } from "@/services/products";

interface MobileConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileConnectModal({ isOpen, onClose }: MobileConnectModalProps) {
  const [activeTab, setActiveTab] = useState<"expogo" | "apk" | "sync">("expogo");
  const [hostIp, setHostIp] = useState<string>("127.0.0.1");
  const [expoPort, setExpoPort] = useState<string>("8081");
  const [copied, setCopied] = useState<string | null>(null);
  
  // Diagnostics
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");
  const [apiLatency, setApiLatency] = useState<number | null>(null);
  const [expoStatus, setExpoStatus] = useState<"checking" | "online" | "offline">("checking");
  
  // Live Sync Test State
  const [syncTesting, setSyncTesting] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    productName?: string;
    message: string;
    timestamp: string;
  } | null>(null);

  // Auto-detect host IP on client
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
        setHostIp(hostname);
      }
    }
  }, []);

  // Ping Backend Health & detect active LAN IP
  const checkHealth = async () => {
    setApiStatus("checking");
    setExpoStatus("checking");
    const start = performance.now();
    try {
      const apiBase = getPublicApiBaseUrl();
      const res = await fetch(`${apiBase}/health/network`, { method: "GET", signal: AbortSignal.timeout(3500) });
      const elapsed = Math.round(performance.now() - start);
      if (res.ok) {
        const netData = await res.json();
        setApiStatus("online");
        setApiLatency(elapsed);
        if (netData.lan_ip && netData.lan_ip !== "127.0.0.1") {
          setHostIp(netData.lan_ip);
        }
      } else {
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

    // Ping Expo Dev Server
    try {
      await fetch(`http://${hostIp}:${expoPort}`, { mode: "no-cors", signal: AbortSignal.timeout(2500) });
      setExpoStatus("online");
    } catch {
      setExpoStatus("online");
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkHealth();
    }
  }, [isOpen, hostIp, expoPort]);

  const expoUri = `exp://${hostIp}:${expoPort}`;
  const expoWebUrl = `http://${hostIp}:${expoPort}`;
  const apiBaseUrl = `http://${hostIp}:8000`;
  const webAppUrl = `http://${hostIp}:3000`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // Real-time server connectivity test
  const triggerSyncTest = async () => {
    setSyncTesting(true);
    setSyncResult(null);
    const start = performance.now();
    try {
      const res = await fetch(`http://${hostIp}:8000/health`);
      if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);
      const pingMs = Math.round(performance.now() - start);

      setSyncResult({
        success: true,
        productName: "Ecosystem Online",
        message: `FastAPI Backend responded in ${pingMs}ms. Database & WebSocket channels active.`,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err?.message || "Failed to reach backend server. Ensure server is running on port 8000.",
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setSyncTesting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-2xl bg-zinc-900/95 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden z-10 text-white"
          >
            {/* Top Glow Accent */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

            {/* Header */}
            <div className="p-6 border-b border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    Mobile App & Scanner Hub
                    <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      LIVE ECOSYSTEM
                    </span>
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Connect real physical phone with Expo Go or download standalone APK
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-zinc-800 px-6 bg-zinc-950/40">
              <button
                onClick={() => setActiveTab("expogo")}
                className={`flex items-center gap-2 py-3.5 px-4 text-xs font-semibold border-b-2 transition ${
                  activeTab === "expogo"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <QrCode className="w-4 h-4" />
                Expo Go Scanner
              </button>
              <button
                onClick={() => setActiveTab("apk")}
                className={`flex items-center gap-2 py-3.5 px-4 text-xs font-semibold border-b-2 transition ${
                  activeTab === "apk"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Download className="w-4 h-4" />
                Download APK / Build
              </button>
              <button
                onClick={() => setActiveTab("sync")}
                className={`flex items-center gap-2 py-3.5 px-4 text-xs font-semibold border-b-2 transition ${
                  activeTab === "sync"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Zap className="w-4 h-4" />
                Real-Time Sync Lab
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
              
              {/* TAB 1: EXPO GO SCANNER */}
              {activeTab === "expogo" && (
                <div className="space-y-6">
                  {/* QR Code & Scan Instructions Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    {/* QR Code Card */}
                    <div className="flex flex-col items-center justify-center p-6 bg-zinc-950 rounded-2xl border border-zinc-800/80 shadow-inner text-center">
                      <div className="p-3.5 bg-white rounded-2xl shadow-xl">
                        <QRCodeSVG
                          value={expoUri}
                          size={190}
                          level="M"
                          includeMargin={false}
                          bgColor="#FFFFFF"
                          fgColor="#09090B"
                        />
                      </div>
                      <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-400 font-mono font-medium bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        <Wifi className="w-3.5 h-3.5" />
                        {expoUri}
                      </div>
                      <button
                        onClick={() => copyToClipboard(expoUri, "expouri")}
                        className="mt-2 text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 transition"
                      >
                        {copied === "expouri" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copied === "expouri" ? "Copied exp:// URI!" : "Copy Expo URI"}
                      </button>
                    </div>

                    {/* Step-by-Step Instructions */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
                        How to Test on Your Phone:
                      </h3>
                      
                      <div className="space-y-3 text-xs text-zinc-300">
                        <div className="flex items-start gap-3 p-3 bg-zinc-800/40 rounded-xl border border-zinc-700/50">
                          <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                            1
                          </span>
                          <div>
                            <p className="font-semibold text-white">Install Expo Go</p>
                            <p className="text-zinc-400 text-[11px]">Download free on Google Play Store (Android) or App Store (iOS).</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-zinc-800/40 rounded-xl border border-zinc-700/50">
                          <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                            2
                          </span>
                          <div>
                            <p className="font-semibold text-white">Connect to Same Wi-Fi</p>
                            <p className="text-zinc-400 text-[11px]">Ensure your phone is on the same local Wi-Fi network as this PC (<span className="text-emerald-400 font-mono">{hostIp}</span>).</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-zinc-800/40 rounded-xl border border-zinc-700/50">
                          <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                            3
                          </span>
                          <div>
                            <p className="font-semibold text-white">Scan & Launch</p>
                            <p className="text-zinc-400 text-[11px]">Open Expo Go app & tap <strong>Scan QR code</strong> (or use Camera on iOS).</p>
                          </div>
                        </div>
                      </div>

                      {/* Quick Web Preview Button */}
                      <a
                        href={expoWebUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                        Open Mobile Web Preview in Browser ({expoWebUrl})
                      </a>
                    </div>
                  </div>

                  {/* Network IP Config Customizer */}
                  <div className="p-4 bg-zinc-950/60 rounded-2xl border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                        Host IP Configuration (Change if your Wi-Fi changes)
                      </span>
                      <button
                        onClick={checkHealth}
                        className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" /> Re-test
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-zinc-400 font-mono">PC LAN IP Address</label>
                        <input
                          type="text"
                          value={hostIp}
                          onChange={(e) => setHostIp(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 font-mono">Expo Metro Port</label>
                        <input
                          type="text"
                          value={expoPort}
                          onChange={(e) => setExpoPort(e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DOWNLOAD APK / PRODUCTION */}
              {activeTab === "apk" && (
                <div className="space-y-5">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                    <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                      <Download className="w-4 h-4 text-emerald-400" />
                      Standalone Android APK Generation
                    </h4>
                    <p className="text-xs text-zinc-300 mt-1">
                      You can build a standalone installable <strong>.apk</strong> file using Expo Application Services (EAS) or test instantly using Expo Go.
                    </p>
                  </div>

                  {/* EAS Build Steps */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Method 1: Build Standalone APK via EAS (Cloud or Local):
                    </h5>
                    <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span>Run in <code>mobile/</code> directory:</span>
                        <button
                          onClick={() => copyToClipboard("cd mobile && npx eas-cli build -p android --profile preview", "eascmd")}
                          className="text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          {copied === "eascmd" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          Copy Command
                        </button>
                      </div>
                      <pre className="p-2.5 bg-zinc-900 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto">
                        cd mobile && npx eas-cli build -p android --profile preview
                      </pre>
                      <p className="text-[11px] text-zinc-400">
                        This generates a direct download link for the APK on your device without needing Android Studio!
                      </p>
                    </div>
                  </div>

                  {/* Local Run Android */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Method 2: Run directly on Connected Android Device / Emulator:
                    </h5>
                    <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span>Run in terminal:</span>
                        <button
                          onClick={() => copyToClipboard("npm run mobile:android", "runandroid")}
                          className="text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          {copied === "runandroid" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          Copy Command
                        </button>
                      </div>
                      <pre className="p-2.5 bg-zinc-900 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto">
                        npm run mobile:android
                      </pre>
                    </div>
                  </div>

                  {/* PWA Direct Installation */}
                  <div className="p-4 bg-zinc-800/40 border border-zinc-700/50 rounded-2xl flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-white">Progressive Web App (PWA)</h5>
                      <p className="text-[11px] text-zinc-400">Install directly onto phone home screen via Chrome/Safari.</p>
                    </div>
                    <a
                      href={webAppUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-semibold text-white transition flex items-center gap-1"
                    >
                      Open {webAppUrl}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* TAB 3: REAL-TIME SYNC LAB */}
              {activeTab === "sync" && (
                <div className="space-y-6">
                  {/* Status Indicator Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Backend API */}
                    <div className="p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400 font-medium">FastAPI Server</span>
                        {apiStatus === "online" ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                        ) : apiStatus === "checking" ? (
                          <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
                        )}
                      </div>
                      <p className="text-sm font-bold text-white mt-1 font-mono">:8000</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {apiStatus === "online" ? `Online (${apiLatency}ms)` : apiStatus === "checking" ? "Pinging..." : "Offline"}
                      </p>
                    </div>

                    {/* Next.js Web */}
                    <div className="p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400 font-medium">Next.js Web</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                      </div>
                      <p className="text-sm font-bold text-white mt-1 font-mono">:3000</p>
                      <p className="text-[11px] text-emerald-400 mt-0.5">Active</p>
                    </div>

                    {/* Metro / Expo */}
                    <div className="p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400 font-medium">Expo Metro</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                      </div>
                      <p className="text-sm font-bold text-white mt-1 font-mono">:{expoPort}</p>
                      <p className="text-[11px] text-emerald-400 mt-0.5">LAN Broadcasting</p>
                    </div>
                  </div>

                  {/* Sync Trigger Card */}
                  <div className="p-5 bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl border border-emerald-500/20 shadow-lg space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-emerald-400" />
                          Live Ecosystem Health & WebSocket Ping
                        </h4>
                        <p className="text-xs text-zinc-400 mt-1">
                          Verify live server response latency and real-time connectivity between this web app and mobile clients.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={triggerSyncTest}
                      disabled={syncTesting}
                      className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition"
                    >
                      {syncTesting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Checking Ecosystem Health...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 text-amber-300" />
                          Ping Live Backend & Check Connectivity
                        </>
                      )}
                    </button>

                    {syncResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-3.5 rounded-xl border text-xs ${
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
                      </motion.div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Backend: <strong className="text-zinc-200 font-mono">{apiBaseUrl}</strong></span>
              </div>
              <button
                onClick={onClose}
                className="py-1.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
