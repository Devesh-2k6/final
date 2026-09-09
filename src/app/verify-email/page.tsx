"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Store,
  ShoppingBag,
  Leaf,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { verifyEmail, resendVerification, instantVerifyEmail, type AuthUser } from "@/services/auth";
import { useAuth } from "@/contexts/AuthenticationContext";
import { getErrorMessage } from "@/api/errors";

type VerificationStatus = "loading" | "success" | "expired" | "invalid" | "already_verified";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { user: currentUser, refreshUser } = useAuth();

  const [status, setStatus] = useState<VerificationStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState<string>("");
  const [verifiedUser, setVerifiedUser] = useState<AuthUser | null>(null);

  // Manual token verification state
  const [manualToken, setManualToken] = useState("");
  const [verifyingManual, setVerifyingManual] = useState(false);

  // Resend state for expired/invalid fallback
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendMsg, setResendMsg] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const verifyTokenString = async (tokenToVerify: string) => {
    try {
      setStatus("loading");
      const response = await verifyEmail(tokenToVerify.trim());
      if (response.success) {
        setStatus("success");
        setVerifiedEmail(response.email || currentUser?.email || "");
        if (response.user) {
          setVerifiedUser(response.user);
        }
        await refreshUser();
      } else {
        setStatus("invalid");
        setErrorMessage(response.message || "Verification failed. Please request a new verification link.");
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      if (msg.toLowerCase().includes("expired")) {
        setStatus("expired");
        setErrorMessage(msg);
      } else if (msg.toLowerCase().includes("already verified")) {
        setStatus("already_verified");
        setErrorMessage(msg);
      } else {
        setStatus("invalid");
        setErrorMessage(msg || "Invalid or used verification link.");
      }
    }
  };

  useEffect(() => {
    if (!token || !token.trim()) {
      setStatus("invalid");
      setErrorMessage("No verification token found in the URL. Please click the exact link from your email.");
      return;
    }

    let isMounted = true;

    async function executeVerification() {
      try {
        const response = await verifyEmail(token as string);
        if (!isMounted) return;

        if (response.success) {
          setStatus("success");
          setVerifiedEmail(response.email || currentUser?.email || "");
          if (response.user) {
            setVerifiedUser(response.user);
          }
          // Refresh context state so banners and permissions immediately reflect verified status
          await refreshUser();
        } else {
          setStatus("invalid");
          setErrorMessage(response.message || "Verification failed. Please request a new verification link.");
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = getErrorMessage(err);
        if (msg.toLowerCase().includes("expired")) {
          setStatus("expired");
          setErrorMessage(msg);
        } else if (msg.toLowerCase().includes("already verified")) {
          setStatus("already_verified");
          setErrorMessage(msg);
        } else {
          setStatus("invalid");
          setErrorMessage(msg || "Invalid or used verification link.");
        }
      }
    }

    void executeVerification();

    return () => {
      isMounted = false;
    };
  }, [token, refreshUser, currentUser]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = resendEmail.trim().toLowerCase() || verifiedEmail || currentUser?.email || "";
    if (!targetEmail || cooldown > 0 || resending) return;

    setResending(true);
    setResendMsg("");
    setResendSuccess(false);

    try {
      const res = await resendVerification(targetEmail);
      setResendSuccess(true);
      setResendMsg(res.message || "A fresh verification link has been dispatched to your email!");
      setCooldown(60);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setResendSuccess(false);
      setResendMsg(msg);
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

  const isOwner = verifiedUser?.is_shop_owner ?? currentUser?.is_shop_owner ?? false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ECFDF5] via-[#F8FAFC] to-[#F0FDF4] dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950/40 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden transition-colors">
      {/* Soft Ambient Glows */}
      <div className="absolute top-0 inset-x-0 h-[100vh] overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-20 w-[45vw] h-[45vw] min-w-[450px] min-h-[450px] bg-emerald-400/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-[50%] -right-20 w-[40vw] h-[40vw] min-w-[400px] min-h-[400px] bg-teal-300/20 rounded-full blur-[140px]" />
      </div>

      <Link href="/" className="relative z-10 flex items-center gap-2.5 mb-8 text-slate-900 dark:text-white group cursor-pointer">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-2xl text-white group-hover:scale-105 transition-transform duration-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          <Leaf size={24} />
        </div>
        <span className="text-3xl font-black tracking-tight">
          Mee<span className="text-purple-600 dark:text-purple-400">va</span>
        </span>
      </Link>

      <div className="relative z-10 w-full max-w-lg bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-emerald-100/80 dark:border-gray-800 p-8 sm:p-10 text-center">
        {/* State: LOADING */}
        {status === "loading" && (
          <div className="py-8 space-y-6">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
              <div className="relative bg-gradient-to-tr from-emerald-600 to-teal-500 text-white p-5 rounded-full shadow-lg shadow-emerald-500/30">
                <RefreshCw size={36} className="animate-spin" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Verifying Your Email
              </h2>
              <p className="text-sm text-slate-500 dark:text-gray-400 font-medium">
                Validating your cryptographic security token with Meeva servers...
              </p>
            </div>
          </div>
        )}

        {/* State: SUCCESS */}
        {status === "success" && (
          <div className="py-4 space-y-6">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 bg-emerald-400/30 rounded-full blur-lg" />
              <div className="relative bg-gradient-to-tr from-emerald-500 to-teal-500 text-white p-5 rounded-3xl shadow-xl shadow-emerald-500/25">
                <CheckCircle2 size={40} className="stroke-[2.5]" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-black uppercase tracking-wider">
                <Sparkles size={14} /> Verification Confirmed
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Email Verified!
              </h2>
              <p className="text-sm text-slate-600 dark:text-gray-300 font-medium max-w-sm mx-auto">
                {verifiedEmail ? (
                  <>
                    <span className="font-bold text-slate-900 dark:text-white">{verifiedEmail}</span> has been confirmed.
                  </>
                ) : (
                  "Your email address has been successfully verified."
                )}{" "}
                Your account is now fully active with complete privileges.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              {isOwner ? (
                <Link
                  href="/shop"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black px-6 py-3.5 rounded-2xl transition shadow-lg shadow-emerald-500/25 cursor-pointer"
                >
                  <Store size={18} />
                  Open Merchant Dashboard
                </Link>
              ) : (
                <Link
                  href="/deals"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#FF5B26] hover:bg-[#E54B18] active:scale-95 text-white font-black px-6 py-3.5 rounded-2xl transition shadow-lg shadow-orange-500/25 cursor-pointer"
                >
                  <ShoppingBag size={18} />
                  Explore Live Deals
                </Link>
              )}
            </div>
          </div>
        )}

        {/* State: EXPIRED */}
        {status === "expired" && (
          <div className="py-4 space-y-6">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 p-5 rounded-3xl border border-amber-500/20 shadow-lg">
                <Clock size={40} className="stroke-[2.5]" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-black uppercase tracking-wider">
                <AlertTriangle size={14} /> Link Expired (24h Limit)
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Verification Link Expired
              </h2>
              <p className="text-sm text-slate-600 dark:text-gray-300 font-medium">
                For your security, verification links expire after 24 hours. Request a new link below to activate your account.
              </p>
            </div>

            <form onSubmit={handleResend} className="space-y-3 pt-2 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-gray-400 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  className="w-full rounded-2xl border border-emerald-100 dark:border-gray-700 bg-white dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-medium text-sm"
                />
              </div>

              {resendMsg && (
                <p
                  className={`text-xs font-semibold rounded-xl px-3.5 py-2.5 border ${
                    resendSuccess
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200"
                      : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200"
                  }`}
                >
                  {resendMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={resending || cooldown > 0}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black py-3.5 rounded-2xl transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {resending ? <RefreshCw size={18} className="animate-spin" /> : <Mail size={18} />}
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Verification Email"}
              </button>
            </form>
          </div>
        )}

        {/* State: ALREADY VERIFIED */}
        {status === "already_verified" && (
          <div className="py-4 space-y-6">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-5 rounded-3xl border border-emerald-500/20 shadow-lg">
                <ShieldCheck size={40} className="stroke-[2.5]" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Already Verified!
              </h2>
              <p className="text-sm text-slate-600 dark:text-gray-300 font-medium">
                Your email address is already verified and your account is in good standing. You can proceed directly to Meeva.
              </p>
            </div>

            <div className="pt-2 flex justify-center">
              <Link
                href="/deals"
                className="inline-flex items-center gap-2 bg-[#FF5B26] hover:bg-[#E54B18] text-white font-black px-6 py-3.5 rounded-2xl transition shadow-lg shadow-orange-500/25 cursor-pointer"
              >
                Go to Deals Feed <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        )}

        {/* State: INVALID */}
        {status === "invalid" && (
          <div className="py-4 space-y-6">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="bg-red-500/10 text-red-600 dark:text-red-400 p-5 rounded-3xl border border-red-500/20 shadow-lg">
                <XCircle size={40} className="stroke-[2.5]" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Invalid Verification Link
              </h2>
              <p className="text-sm text-slate-600 dark:text-gray-300 font-medium">
                {errorMessage || "The link you followed is invalid, expired, or has already been used."}
              </p>
            </div>

            {currentUser && !currentUser.email_verified && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/80 space-y-2 text-left">

                <div className="flex items-center gap-2 text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  <Sparkles size={14} /> Instant Dev Mode Verification
                </div>
                <p className="text-xs text-slate-600 dark:text-gray-300 font-medium">
                  Logged in as <span className="font-bold">{currentUser.email}</span>. Click below to verify instantly:
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    setResending(true);
                    try {
                      await instantVerifyEmail(currentUser.email);
                      setStatus("success");
                      setVerifiedEmail(currentUser.email);
                      await refreshUser();
                    } catch (err: unknown) {
                      setErrorMessage(getErrorMessage(err));
                    } finally {
                      setResending(false);
                    }
                  }}
                  disabled={resending}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs disabled:opacity-50"
                >
                  {resending ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  ⚡ Verify {currentUser.email} Now
                </button>
              </div>
            )}

            {/* Manual Token Entry Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const clean = manualToken.includes("token=")
                  ? manualToken.split("token=")[1].split("&")[0]
                  : manualToken;
                if (clean.trim()) {
                  verifyTokenString(clean);
                }
              }}
              className="space-y-3 pt-2 text-left bg-slate-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-slate-200 dark:border-gray-700"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                  🔑 Have a Verification Token or Link?
                </label>
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Paste verification token or full link here"
                  className="w-full rounded-xl border border-emerald-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-slate-900 dark:text-white px-3.5 py-2.5 outline-none focus:border-emerald-500 font-mono text-xs"
                />
              </div>
              <button
                type="submit"
                disabled={!manualToken.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                Verify Token
              </button>
            </form>

            <form onSubmit={handleResend} className="space-y-3 pt-2 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-gray-400 mb-1">
                  Request Fresh Verification Link
                </label>
                <input
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  className="w-full rounded-2xl border border-emerald-100 dark:border-gray-700 bg-white dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-medium text-sm"
                />
              </div>

              {resendMsg && (
                <p
                  className={`text-xs font-semibold rounded-xl px-3.5 py-2.5 border ${
                    resendSuccess
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200"
                      : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200"
                  }`}
                >
                  {resendMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={resending || cooldown > 0}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black py-3.5 rounded-2xl transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {resending ? <RefreshCw size={18} className="animate-spin" /> : <Mail size={18} />}
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Link"}
              </button>
            </form>

            <div className="pt-2 flex items-center justify-center gap-4 text-xs font-bold text-slate-500">
              <Link href="/auth?tab=login" className="text-emerald-600 hover:underline">
                Sign In to Account
              </Link>
              <span>•</span>
              <Link href="/auth?tab=signup" className="text-emerald-600 hover:underline">
                Create New Account
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-950 text-emerald-500">
          <RefreshCw className="animate-spin" size={36} />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
