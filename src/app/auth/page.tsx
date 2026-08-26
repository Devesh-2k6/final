"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Leaf, Loader2, Store, ShoppingBag } from "lucide-react";

import { getErrorMessage } from "@/api/errors";
import { useAuth } from "@/contexts/AuthenticationContext";
import { clearRoleIntent, getRoleIntent, setRoleIntent } from "@/lib/auth-storage";
import { getMyShop } from "@/services/shops";
import { login, register } from "@/services/auth";

type Tab = "login" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginUser, isAuthenticated, isLoading: authLoading, user } = useAuth();

  const intentParam = searchParams.get("role");
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "login";

  const [tab, setTab] = useState<Tab>(initialTab);
  const [isShopOwner, setIsShopOwner] = useState(intentParam === "shop_owner");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // OTP Verification States
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const override = localStorage.getItem("EXPIRYGO_API_OVERRIDE");
      if (override && override.includes("onrender.com")) {
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
      if (user.is_shop_owner || intent === "shop_owner") {
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

  const redirectAfterAuth = async (isOwner: boolean) => {
    if (isOwner) {
      try {
        await getMyShop();
        router.push("/shop");
      } catch {
        router.push("/shop/setup");
      }
    } else {
      router.push("/deals");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

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
        const res = await register({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          is_shop_owner: isShopOwner,
          phone_number: phoneNumber.trim() || undefined,
        });

        // 1. Immediately store token and update React state
        loginUser(res.user, res.access_token);
        clearRoleIntent();

        // 2. Perform navigation with token established
        if (isShopOwner) {
          router.replace("/shop/setup");
        } else {
          router.replace("/deals");
        }
      } catch (err: unknown) {
        const msg = getErrorMessage(err);
        if (msg.toLowerCase().includes("already registered")) {
          setError("This email address is already registered. Please switch to the Sign In tab to log in.");
        } else {
          setError(msg);
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    try {
      const res = await login({ email: email.trim(), password });

      // 1. Establish session in React state
      loginUser(res.user, res.access_token);
      clearRoleIntent();

      // 2. React Native-style fast transition
      const nextPath = res.user.is_shop_owner ? "/shop" : "/deals";
      router.replace(nextPath);

    } catch (err: any) {
      if (err.message?.includes("fetch")) {
        setError("Network Connection Error: Server is currently unreachable.");
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
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
      {/* Ambient Soft Glow Background Elements */}
      <div className="absolute top-0 inset-x-0 h-[100vh] overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-20 w-[45vw] h-[45vw] min-w-[450px] min-h-[450px] bg-emerald-400/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-[50%] -right-20 w-[40vw] h-[40vw] min-w-[400px] min-h-[400px] bg-teal-300/20 rounded-full blur-[140px]" />
      </div>

      <Link href="/" className="relative z-10 flex items-center gap-2.5 mb-8 text-slate-900 dark:text-white group cursor-pointer">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-2xl text-white group-hover:scale-105 transition-transform duration-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          <Leaf size={24} />
        </div>
        <span className="text-3xl font-black tracking-tight">
          Expiry<span className="text-emerald-600 dark:text-emerald-400">Go</span>
        </span>
      </Link>

      <div className="relative z-10 w-full max-w-md bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-emerald-100/80 dark:border-gray-800 overflow-hidden">
        <div className="flex border-b border-emerald-100/60 dark:border-gray-800 p-1.5 bg-emerald-50/40 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={() => setTab("login")}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${
              tab === "login"
                ? "text-emerald-700 dark:text-emerald-400 bg-white dark:bg-gray-800 shadow-md shadow-emerald-500/5"
                : "text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => setTab("signup")}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${
              tab === "signup"
                ? "text-emerald-700 dark:text-emerald-400 bg-white dark:bg-gray-800 shadow-md shadow-emerald-500/5"
                : "text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
          {tab === "signup" && (
            <>
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                  Full name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-2xl border border-emerald-100 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-2">
                  I am a
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsShopOwner(false)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-2xl border-2 text-sm font-bold transition-all cursor-pointer ${
                      !isShopOwner
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 shadow-sm"
                        : "border-emerald-100/60 dark:border-gray-800 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:border-emerald-200"
                    }`}
                  >
                    <ShoppingBag size={18} />
                    Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsShopOwner(true)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-2xl border-2 text-sm font-bold transition-all cursor-pointer ${
                      isShopOwner
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 shadow-sm"
                        : "border-emerald-100/60 dark:border-gray-800 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:border-emerald-200"
                    }`}
                  >
                    <Store size={18} />
                    Shopkeeper
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-2xl border border-emerald-100 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                  placeholder="e.g., 9876543210"
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
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-emerald-100 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
              placeholder="you@example.com"
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
                autoComplete={tab === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-emerald-100 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 pr-11 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 transition"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {tab === "signup" && (
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                Confirm password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-2xl border border-emerald-100 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                placeholder="••••••••"
              />
            </div>
          )}

          {error && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200/50 dark:border-red-500/20 rounded-2xl px-4 py-3">
                {error}
              </p>
              {error.includes("connect") && (
                <button
                  type="button"
                  onClick={() => {
                    const ip = prompt("Enter your local backend IP (e.g. 192.168.1.5:8000) or keep empty for localhost:8000:");
                    const newUrl = ip ? `http://${ip}` : "http://localhost:8000";
                    localStorage.setItem("EXPIRYGO_API_OVERRIDE", newUrl);
                    window.location.reload();
                  }}
                  className="w-full py-2.5 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded-2xl hover:bg-emerald-500/5 transition"
                >
                  ⚙️ Switch to Local Demo Server
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-4 rounded-2xl transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.98] cursor-pointer"
          >
            {submitting && <Loader2 size={18} className="animate-spin" />}
            {tab === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 dark:text-gray-400 pb-6 px-4">
          Browse deals without an account from the{" "}
          <Link href="/" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
            home page
          </Link>
          .
        </p>
      </div>

    </div>
  );
}
