"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  Leaf,
  Loader2,
  Store,
  ShoppingBag,
  Mail,
  RefreshCw,
  Sparkles,
  KeyRound,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { getErrorMessage } from "@/api/errors";
import { useAuth } from "@/contexts/AuthenticationContext";
import { clearRoleIntent, getRoleIntent, setRoleIntent } from "@/lib/auth-storage";
import { getMyShop } from "@/services/shops";
import {
  login,
  register,
  resendVerification,
  sendOtp,
  verifyOtp,
  getDevMailbox,
} from "@/services/auth";

type Tab = "login" | "signup" | "otp";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginUser, isAuthenticated, isLoading: authLoading, user } = useAuth();

  const intentParam = searchParams.get("role");
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : searchParams.get("tab") === "otp" ? "otp" : "login";

  const [tab, setTab] = useState<Tab>(initialTab);
  const [isShopOwner, setIsShopOwner] = useState(intentParam === "shop_owner");
  const [loginRole, setLoginRole] = useState<"customer" | "shop" | "admin">(
    intentParam === "shop_owner" ? "shop" : "customer"
  );
  const [name, setName] = useState("");

  const [email, setEmail] = useState("customer@test.com");
  const [password, setPassword] = useState("password123");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Unverified prompt state on password login
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  // OTP Verification States
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpIdentifier, setOtpIdentifier] = useState("customer@test.com");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtpLoading, setVerifyingOtpLoading] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpStatusMsg, setOtpStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const override = localStorage.getItem("EXPIRYGO_API_OVERRIDE");
      if (override && (override.includes("onrender.com") || override.includes("loca.lt"))) {
        localStorage.removeItem("EXPIRYGO_API_OVERRIDE");
      }
    }
  }, []);

  useEffect(() => {
    if (intentParam === "shop_owner") {
      setIsShopOwner(true);
      setRoleIntent("shop_owner");
    } else if (intentParam === "customer") {
      setIsShopOwner(false);
      setRoleIntent("customer");
    }
  }, [intentParam]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !user) return;

    void (async () => {
      const intent = getRoleIntent();
      if (user.role === "ADMIN" || user.email?.toLowerCase().startsWith("admin")) {
        clearRoleIntent();
        router.replace("/admin");
      } else if (user.is_shop_owner || intent === "shop_owner") {
        try {
          await getMyShop();
          clearRoleIntent();
          router.replace("/shop");
        } catch {
          clearRoleIntent();
          router.replace("/shop/setup");
        }
      } else {
        clearRoleIntent();
        router.replace("/deals");
      }
    })();
  }, [authLoading, isAuthenticated, user, router]);

  const executeLogin = async (loginEmail: string, loginPass: string) => {
    setSubmitting(true);
    setError("");
    setUnverifiedEmail(null);
    try {
      const res = await login({ email: loginEmail.trim(), password: loginPass });
      loginUser(res.user, res.access_token);
      clearRoleIntent();

      let nextPath = "/deals";
      if (res.user.role === "ADMIN" || res.user.email?.toLowerCase().startsWith("admin")) {
        nextPath = "/admin";
      } else if (res.user.is_shop_owner) {
        nextPath = "/shop";
      }

      router.replace(nextPath);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      if (msg.toLowerCase().includes("not verified")) {
        setUnverifiedEmail(loginEmail.trim());
        setError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemoLogin = (demoEmail: string, roleType: "customer" | "shop" | "admin") => {
    setLoginRole(roleType);
    setEmail(demoEmail);
    setPassword("password123");
    executeLogin(demoEmail, "password123");
  };

  const handleSendOtp = async (targetId?: string) => {
    const idToSend = (targetId || otpIdentifier).trim();
    if (!idToSend) {
      setError("Please enter your email or phone number to receive an OTP.");
      return;
    }
    setError("");
    setSendingOtp(true);
    setOtpStatusMsg(null);
    try {
      const res = await sendOtp(idToSend, name.trim() || undefined);
      setOtpSent(true);
      setOtpCooldown(60);
      setOtpStatusMsg({
        type: "success",
        text: res.message || `6-digit OTP code dispatched to ${idToSend}!`,
      });
      if (res.dev_code) {
        setOtpCode(res.dev_code);
        setOtpStatusMsg({
          type: "success",
          text: `⚡ Verification code sent! (Dev Auto-filled: ${res.dev_code})`,
        });
      } else {
        // Fallback check dev mailbox
        try {
          const devData = await getDevMailbox();
          const latest = devData.emails?.find(
            (m) => m.to_email?.toLowerCase() === idToSend.toLowerCase() && m.token
          );
          if (latest?.token) {
            setOtpCode(latest.token);
          }
        } catch {
          // Ignore
        }
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setError(msg);
      setOtpStatusMsg({ type: "error", text: msg });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleFetchDevOtp = async () => {
    try {
      const devData = await getDevMailbox();
      const latest = devData.emails?.find(
        (m) => m.to_email?.toLowerCase() === otpIdentifier.trim().toLowerCase() && m.token
      ) || devData.emails?.[0];

      if (latest?.token) {
        setOtpCode(latest.token);
        setError("");
        setOtpStatusMsg({
          type: "success",
          text: `⚡ Auto-filled Dev OTP: ${latest.token}`,
        });
      } else {
        setError("No recent OTP found in Dev Mailbox. Please click 'Resend OTP'.");
      }
    } catch {
      setError("Could not reach backend Dev Mailbox.");
    }
  };

  const handleVerifyOtpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 4) {
      setError("Please enter the 6-digit OTP code.");
      return;
    }
    setError("");
    setVerifyingOtpLoading(true);
    try {
      const res = await verifyOtp(
        otpIdentifier.trim(),
        otpCode.trim(),
        name.trim() || undefined,
        isShopOwner
      );
      loginUser(res.user, res.access_token);
      clearRoleIntent();

      let nextPath = "/deals";
      if (res.user.role === "ADMIN" || res.user.email?.toLowerCase().startsWith("admin")) {
        nextPath = "/admin";
      } else if (res.user.is_shop_owner) {
        nextPath = "/shop";
      }

      router.replace(nextPath);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setVerifyingOtpLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (tab === "otp") {
      if (otpSent) {
        await handleVerifyOtpSubmit(e);
      } else {
        await handleSendOtp();
      }
      return;
    }

    if (tab === "signup") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setError("Please enter a valid email address (e.g., name@example.com).");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters for security.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      setSubmitting(true);
      try {
        const regRes = await register({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          is_shop_owner: isShopOwner,
          phone_number: phoneNumber.trim() || undefined,
        });

        // Switch to OTP verification flow immediately with the exact registered OTP
        setOtpIdentifier(email.trim().toLowerCase());
        setOtpSent(true);
        setOtpCooldown(60);
        if (regRes?.dev_otp) {
          setOtpCode(regRes.dev_otp);
        }
        setTab("otp");
        setOtpStatusMsg({
          type: "success",
          text: `Account registered! 6-digit verification code sent to ${email.trim().toLowerCase()}.${regRes?.dev_otp ? ` (Code: ${regRes.dev_otp})` : ""}`,
        });
      } catch (err: unknown) {
        const msg = getErrorMessage(err);
        if (msg.toLowerCase().includes("already registered")) {
          setError("This email address is already registered. Please switch to Sign In to log in.");
        } else {
          setError(msg);
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

    await executeLogin(email, password);
  };

  if (authLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Loader2 className="animate-spin text-emerald-500" size={36} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ECFDF5] via-[#F8FAFC] to-[#F0FDF4] dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950/40 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden transition-colors">
      {/* Ambient Glow Background */}
      <div className="absolute top-0 inset-x-0 h-[100vh] overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-20 w-[45vw] h-[45vw] min-w-[450px] min-h-[450px] bg-emerald-400/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-[50%] -right-20 w-[40vw] h-[40vw] min-w-[400px] min-h-[400px] bg-teal-300/20 rounded-full blur-[140px]" />
      </div>

      <div className="w-full max-w-md bg-white/95 dark:bg-gray-900/90 backdrop-blur-2xl rounded-3xl border border-emerald-100/60 dark:border-gray-800 shadow-2xl shadow-emerald-950/5 relative z-10 overflow-hidden">
        {/* Header Branding */}
        <div className="p-8 pb-4 text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-2 group">
            <div className="bg-emerald-500 text-white p-2 rounded-2xl group-hover:scale-105 transition-transform shadow-md shadow-emerald-500/20">
              <Leaf size={24} />
            </div>
            <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Expiry<span className="text-emerald-500">Go</span>
            </span>
          </Link>
          <p className="text-xs font-semibold text-slate-500 dark:text-gray-400">
            {tab === "signup"
              ? "Join ExpiryGo to rescue surplus food & save money"
              : tab === "otp"
              ? "Fast, passwordless 6-digit OTP login"
              : "Welcome back! Access your account & live deals"}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-emerald-100/60 dark:border-gray-800 p-1.5 bg-emerald-50/40 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setError("");
              setUnverifiedEmail(null);
            }}
            className={`flex-1 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-300 ${
              tab === "login"
                ? "text-emerald-700 dark:text-emerald-400 bg-white dark:bg-gray-800 shadow-md shadow-emerald-500/5"
                : "text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("otp");
              setError("");
              setUnverifiedEmail(null);
            }}
            className={`flex-1 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all duration-300 flex items-center justify-center gap-1 ${
              tab === "otp"
                ? "text-orange-600 dark:text-orange-400 bg-white dark:bg-gray-800 shadow-md shadow-orange-500/5"
                : "text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            <Zap size={14} className="text-orange-500 animate-pulse" />
            OTP Login
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("signup");
              setError("");
              setUnverifiedEmail(null);
            }}
            className={`flex-1 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-300 ${
              tab === "signup"
                ? "text-emerald-700 dark:text-emerald-400 bg-white dark:bg-gray-800 shadow-md shadow-emerald-500/5"
                : "text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* TAB: OTP LOGIN / VERIFY */}
        {tab === "otp" ? (
          <div className="p-6 sm:p-8 space-y-4">
            {/* Account Type Picker */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-2">
                Account Role
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsShopOwner(false)}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-2xl border-2 text-xs font-bold transition-all cursor-pointer ${
                    !isShopOwner
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 shadow-sm"
                      : "border-gray-200 dark:border-gray-800 text-slate-500 dark:text-gray-400"
                  }`}
                >
                  <ShoppingBag size={15} />
                  Customer
                </button>
                <button
                  type="button"
                  onClick={() => setIsShopOwner(true)}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-2xl border-2 text-xs font-bold transition-all cursor-pointer ${
                    isShopOwner
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 shadow-sm"
                      : "border-gray-200 dark:border-gray-800 text-slate-500 dark:text-gray-400"
                  }`}
                >
                  <Store size={15} />
                  Shopkeeper
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                Email Address or Phone
              </label>
              <input
                type="text"
                required
                value={otpIdentifier}
                onChange={(e) => {
                  setOtpIdentifier(e.target.value);
                  setOtpSent(false);
                }}
                className="w-full rounded-2xl border border-orange-200 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-medium text-sm"
                placeholder="e.g. name@example.com"
              />
            </div>

            {otpSent ? (
              <form onSubmit={handleVerifyOtpSubmit} className="space-y-4 pt-1">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400">
                      Enter 6-Digit OTP Code
                    </label>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                      ⏱️ Valid for 10 min
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    autoFocus
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full text-center tracking-[10px] text-2xl font-black font-mono rounded-2xl border-2 border-orange-400 dark:border-orange-500 bg-orange-50/30 dark:bg-gray-950 text-slate-900 dark:text-white py-3.5 outline-none focus:ring-4 focus:ring-orange-500/20 transition-all"
                    placeholder="••••••"
                  />
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleFetchDevOtp}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 cursor-pointer bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40"
                    >
                      <Sparkles size={12} />
                      Auto-fill Dev OTP
                    </button>
                  </div>
                </div>

                {otpStatusMsg && (
                  <p
                    className={`text-xs font-semibold rounded-xl px-3.5 py-2.5 border ${
                      otpStatusMsg.type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200"
                        : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200"
                    }`}
                  >
                    {otpStatusMsg.text}
                  </p>
                )}

                {error && (
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200/50 dark:border-red-500/20 rounded-2xl px-4 py-3">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={verifyingOtpLoading || otpCode.length < 4}
                  className="w-full bg-[#FF5B26] hover:bg-[#E54B18] text-white font-black py-4 rounded-2xl transition shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
                >
                  {verifyingOtpLoading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                  Verify OTP & Sign In
                </button>

                <div className="flex justify-between items-center pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode("");
                    }}
                    className="text-slate-500 hover:text-slate-800 dark:hover:text-white font-semibold cursor-pointer"
                  >
                    Change Email/Number
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={sendingOtp || otpCooldown > 0}
                    className="text-orange-600 font-bold hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    {sendingOtp ? "Sending..." : otpCooldown > 0 ? `Resend in ${otpCooldown}s` : "Resend OTP"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 pt-1">
                {otpStatusMsg && (
                  <p
                    className={`text-xs font-semibold rounded-xl px-3.5 py-2.5 border ${
                      otpStatusMsg.type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200"
                        : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200"
                    }`}
                  >
                    {otpStatusMsg.text}
                  </p>
                )}

                {error && (
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200/50 dark:border-red-500/20 rounded-2xl px-4 py-3">
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  disabled={sendingOtp || !otpIdentifier.trim()}
                  className="w-full bg-[#FF5B26] hover:bg-[#E54B18] text-white font-black py-4 rounded-2xl transition shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
                >
                  {sendingOtp ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
                  Send 6-Digit OTP Code
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
            {tab === "login" && (
              <div className="space-y-3 mb-4">
                {/* Role Switcher */}
                <div className="flex bg-slate-100 dark:bg-gray-800/80 p-1 rounded-2xl gap-1 border border-slate-200/60 dark:border-gray-700/60">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginRole("customer");
                      setEmail("customer@test.com");
                      setPassword("password123");
                      setUnverifiedEmail(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      loginRole === "customer"
                        ? "bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-400 shadow-sm border border-emerald-100 dark:border-emerald-950"
                        : "text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white"
                    }`}
                  >
                    <ShoppingBag size={14} />
                    Shopper
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginRole("shop");
                      setEmail("shop1@test.com");
                      setPassword("password123");
                      setUnverifiedEmail(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      loginRole === "shop"
                        ? "bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-400 shadow-sm border border-emerald-100 dark:border-emerald-950"
                        : "text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white"
                    }`}
                  >
                    <Store size={14} />
                    Shopkeeper
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginRole("admin");
                      setEmail("admin@test.com");
                      setPassword("password123");
                      setUnverifiedEmail(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      loginRole === "admin"
                        ? "bg-white dark:bg-gray-900 text-purple-700 dark:text-purple-400 shadow-sm border border-purple-100 dark:border-purple-950"
                        : "text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white"
                    }`}
                  >
                    <Sparkles size={14} />
                    Admin
                  </button>
                </div>

                {/* 1-Click Instant Quick Login */}
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={13} className="text-emerald-600 dark:text-emerald-400 animate-pulse" />
                      {loginRole === "customer"
                        ? "⚡ Quick Shopper Access"
                        : loginRole === "admin"
                        ? "⚡ Quick Admin Console"
                        : "⚡ Quick Shopkeeper Access"}
                    </span>
                  </div>

                  {loginRole === "customer" && (
                    <button
                      type="button"
                      onClick={() => handleQuickDemoLogin("customer@test.com", "customer")}
                      className="w-full text-left bg-white dark:bg-gray-900 hover:bg-emerald-50 dark:hover:bg-gray-800 border border-emerald-200 dark:border-gray-700 rounded-xl p-2.5 transition-all flex items-center justify-between group shadow-sm cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                          <ShoppingBag size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-white">customer@test.com</p>
                          <p className="text-[10px] text-slate-400">Verified Consumer</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-600 group-hover:translate-x-0.5 transition-transform">
                        Sign in &rarr;
                      </span>
                    </button>
                  )}

                  {loginRole === "shop" && (
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => handleQuickDemoLogin("shop1@test.com", "shop")}
                        className="w-full text-left bg-white dark:bg-gray-900 hover:bg-emerald-50 dark:hover:bg-gray-800 border border-emerald-200 dark:border-gray-700 rounded-xl p-2 transition-all flex items-center justify-between group shadow-sm cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                            <Store size={14} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-white">shop1@test.com</p>
                            <p className="text-[10px] text-slate-400">Spencer Plaza Store</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600">Sign in &rarr;</span>
                      </button>
                    </div>
                  )}

                  {loginRole === "admin" && (
                    <button
                      type="button"
                      onClick={() => handleQuickDemoLogin("admin@test.com", "admin")}
                      className="w-full text-left bg-white dark:bg-gray-900 hover:bg-purple-50 dark:hover:bg-gray-800 border border-purple-200 dark:border-gray-700 rounded-xl p-2.5 transition-all flex items-center justify-between group shadow-sm cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                          <Sparkles size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-white">admin@test.com</p>
                          <p className="text-[10px] text-slate-400">Master Admin & Moderation</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-purple-600 group-hover:translate-x-0.5 transition-transform">
                        Console &rarr;
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* SIGNUP: Account Type Selection */}
            {tab === "signup" && (
              <>
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-2">
                    I want to
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setIsShopOwner(false)}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                        !isShopOwner
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 shadow-sm"
                          : "border-gray-200 dark:border-gray-800 text-slate-500 dark:text-gray-400"
                      }`}
                    >
                      <ShoppingBag size={20} className="mb-1" />
                      <span className="text-xs font-bold">Buy Surplus Deals</span>
                      <span className="text-[10px] opacity-75">Customer Account</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsShopOwner(true)}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                        isShopOwner
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 shadow-sm"
                          : "border-gray-200 dark:border-gray-800 text-slate-500 dark:text-gray-400"
                      }`}
                    >
                      <Store size={20} className="mb-1" />
                      <span className="text-xs font-bold">Sell Surplus Items</span>
                      <span className="text-[10px] opacity-75">Shopkeeper Account</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-2xl border border-emerald-100 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium text-sm"
                    placeholder="e.g. John Doe"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-emerald-100 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium text-sm"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-emerald-100 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 pr-11 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {tab === "signup" && (
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-2xl border border-emerald-100 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium text-sm"
                  placeholder="••••••••"
                />
              </div>
            )}

            {/* Unverified Email Resolution Banner */}
            {unverifiedEmail && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <AlertCircle size={16} />
                  <span>Email Verification Required</span>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-300/90">
                  A 6-digit verification OTP was sent to <strong>{unverifiedEmail}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOtpIdentifier(unverifiedEmail);
                    setOtpSent(true);
                    setTab("otp");
                    setError("");
                  }}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <KeyRound size={14} /> Enter 6-Digit OTP Code
                </button>
              </div>
            )}

            {error && !unverifiedEmail && (
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200/50 dark:border-red-500/20 rounded-2xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
            >
              {submitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : tab === "signup" ? (
                <CheckCircle2 size={18} />
              ) : (
                <ShieldCheck size={18} />
              )}
              {tab === "signup" ? "Create Account & Get OTP" : "Sign In with Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
