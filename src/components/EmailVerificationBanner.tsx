"use client";

import { useState, useEffect } from "react";
import { Mail, AlertCircle, RefreshCw, CheckCircle2, X, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthenticationContext";
import { resendVerification, instantVerifyEmail } from "@/services/auth";
import { getErrorMessage } from "@/api/errors";

export function EmailVerificationBanner() {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [resending, setResending] = useState(false);
  const [verifyingInstant, setVerifyingInstant] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Check session dismissal state
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDismissed = sessionStorage.getItem("expirygo_email_banner_dismissed");
      if (isDismissed === "true") {
        setDismissed(true);
      }
    }
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Don't render if not authenticated, already verified, or dismissed in session
  if (!isAuthenticated || !user || user.email_verified === true || dismissed) {
    return null;
  }

  const handleInstantVerify = async () => {
    if (!user.email || verifyingInstant) return;
    setVerifyingInstant(true);
    setStatusMessage(null);
    try {
      await instantVerifyEmail(user.email);
      setStatusMessage({ type: "success", text: "⚡ Email verified successfully! Full privileges unlocked." });
      await refreshUser();
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setVerifyingInstant(false);
    }
  };

  const handleResend = async () => {
    if (!user.email || cooldown > 0 || resending) return;

    setResending(true);
    setStatusMessage(null);

    try {
      const res = await resendVerification(user.email);
      setStatusMessage({ type: "success", text: res.message || "Verification link sent! Check your inbox." });
      setCooldown(60);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setStatusMessage({ type: "error", text: msg });
      if (msg.includes("wait")) {
        const match = msg.match(/wait\s+(\d+)\s+seconds/i);
        if (match && match[1]) {
          setCooldown(parseInt(match[1], 10));
        } else {
          setCooldown(60);
        }
      }
    } finally {
      setResending(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("expirygo_email_banner_dismissed", "true");
    }
  };

  return (
    <div className="relative z-50 bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-amber-500/15 backdrop-blur-md border-b border-amber-500/30 dark:border-amber-400/20 text-slate-800 dark:text-slate-100 px-4 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="bg-amber-500/20 text-amber-600 dark:text-amber-400 p-1.5 rounded-lg shrink-0">
            <Mail size={16} className="animate-pulse" />
          </div>
          <p className="font-medium truncate">
            <span className="font-bold text-amber-700 dark:text-amber-300">Action Required:</span> Please verify your email (
            <span className="underline font-semibold">{user.email}</span>) to unlock deal reservations and merchant tools.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {statusMessage && (
            <span
              className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-semibold ${
                statusMessage.type === "success"
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "bg-red-500/20 text-red-700 dark:text-red-300"
              }`}
            >
              {statusMessage.type === "success" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
              {statusMessage.text}
            </span>
          )}

          <button
            type="button"
            onClick={handleInstantVerify}
            disabled={verifyingInstant}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs transition shadow-sm disabled:opacity-50 cursor-pointer"
            title="Instant Dev Mode Verification"
          >
            {verifyingInstant ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
            1-Click Verify
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs transition shadow-sm disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            <RefreshCw size={13} className={resending ? "animate-spin" : ""} />
            {resending
              ? "Sending..."
              : cooldown > 0
              ? `Resend in ${cooldown}s`
              : "Resend Email"}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss verification banner"
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

