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
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (!phoneNumber.trim()) {
        setError("Mobile phone number is required.");
        return;
      }
      
      setSubmitting(true);
      try {
        const res = await register({
          name: name.trim(),
          email: email.trim(),
          password,
          is_shop_owner: isShopOwner,
          phone_number: phoneNumber.trim(),
        });

        // Immediate UI update
        loginUser(res.user, res.access_token);
        clearRoleIntent();

        // Parallelize or optimize redirection
        if (res.user.is_shop_owner) {
          router.replace("/shop/setup"); // Default to setup, useEffect will handle if shop exists
        } else {
          router.replace("/deals");
        }
      } catch (err: unknown) {
        setError(getErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    try {
      const res = await login({ email: email.trim(), password });

      // Immediate UI update
      loginUser(res.user, res.access_token);
      clearRoleIntent();

      if (res.user.is_shop_owner) {
        router.replace("/shop");
      } else {
        router.replace("/deals");
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
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
    <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Ambient Parallax Background Glows */}
      <div className="absolute top-0 inset-x-0 h-[120vh] overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[20%] -left-40 w-[40vw] h-[40vw] min-w-[500px] min-h-[500px] bg-emerald-500/20 rounded-full blur-[130px] animate-pulse" />
        <div className="absolute -bottom-40 -right-20 w-[45vw] h-[45vw] min-w-[600px] min-h-[600px] bg-amber-500/10 rounded-full blur-[150px]" />
      </div>

      <Link href="/" className="relative z-10 flex items-center gap-2 mb-8 text-white group cursor-pointer">
        <div className="bg-emerald-500 p-2 rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
          <Leaf size={22} />
        </div>
        <span className="text-2xl font-black">
          Expiry<span className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">Go</span>
        </span>
      </Link>

      <div className="relative z-10 w-full max-w-md bg-[#1A1A1A]/80 backdrop-blur-2xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 overflow-hidden">
        <div className="flex border-b border-white/5">
          <button
            type="button"
            onClick={() => setTab("login")}
            className={`flex-1 py-4 text-sm font-bold transition ${
              tab === "login"
                ? "text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => setTab("signup")}
            className={`flex-1 py-4 text-sm font-bold transition ${
              tab === "signup"
                ? "text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
          {tab === "signup" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Full name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#111111] text-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  I am a
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsShopOwner(false)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition cursor-pointer ${
                      !isShopOwner
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                        : "border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                    }`}
                  >
                    <ShoppingBag size={18} />
                    Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsShopOwner(true)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition cursor-pointer ${
                      isShopOwner
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                        : "border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                    }`}
                  >
                    <Store size={18} />
                    Shopkeeper
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#111111] text-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g., 9876543210"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#111111] text-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete={tab === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#111111] text-white px-4 py-3 pr-11 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {tab === "signup" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Confirm password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#111111] text-white px-4 py-3 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="••••••••"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {submitting && <Loader2 size={18} className="animate-spin" />}
            {tab === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 pb-6 px-4">
          Browse deals without an account from the{" "}
          <Link href="/" className="text-emerald-600 font-semibold">
            home page
          </Link>
          .
        </p>
      </div>

    </div>
  );
}
