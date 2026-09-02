"use client";

import { FormEvent, useEffect, useState, ChangeEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Eye,
  EyeOff,
  Leaf,
  Loader2,
  Store,
  ShoppingBag,
  Sparkles,
  KeyRound,
  ShieldCheck,
  Zap,
  UploadCloud,
  FileCheck,
  AlertCircle,
  ArrowRight,
  MapPin,
} from "lucide-react";

import { getErrorMessage } from "@/api/errors";
import { useAuth } from "@/contexts/AuthenticationContext";
import { clearRoleIntent, getRoleIntent, setRoleIntent } from "@/lib/auth-storage";
import { getMyShop } from "@/services/shops";
import {
  login,
  sendOtp,
  verifyOtp,
  customerSignup,
  vendorSignup,
  uploadAuthFile,
  getDevMailbox,
} from "@/services/auth";

const InteractiveLocationPicker = dynamic(() => import("@/components/InteractiveLocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 rounded-2xl bg-slate-100 dark:bg-gray-800 flex items-center justify-center border border-slate-200 dark:border-gray-700 animate-pulse">
      <div className="flex flex-col items-center gap-2">
        <MapPin size={24} className="text-orange-500 animate-bounce" />
        <span className="text-xs font-bold text-slate-500">Loading High-Definition Live Map...</span>
      </div>
    </div>
  ),
});

type Tab = "login" | "signup" | "otp";
type RoleMode = "customer" | "vendor" | "admin";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginUser, isAuthenticated, isLoading: authLoading, user } = useAuth();

  const initialTab = searchParams.get("tab") === "signup" ? "signup" : searchParams.get("tab") === "otp" ? "otp" : "login";

  const [tab, setTab] = useState<Tab>(initialTab);
  const [roleMode, setRoleMode] = useState<RoleMode>("customer");
  const [loginAuthType, setLoginAuthType] = useState<"password" | "otp">("password");
  const [otpSourceTab, setOtpSourceTab] = useState<"login" | "signup">("login");

  // Customer Signup fields
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPassword, setCustomerPassword] = useState("");
  const [customerConfirmPassword, setCustomerConfirmPassword] = useState("");

  // Vendor Signup fields
  const [vendorShopName, setVendorShopName] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorPassword, setVendorPassword] = useState("");
  const [vendorConfirmPassword, setVendorConfirmPassword] = useState("");
  const [vendorPhotoUrl, setVendorPhotoUrl] = useState("");
  const [vendorDocUrl, setVendorDocUrl] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [vendorLat, setVendorLat] = useState(13.0827);
  const [vendorLng, setVendorLng] = useState(80.2707);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // OTP Verification States
  const [otpIdentifier, setOtpIdentifier] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtpLoading, setVerifyingOtpLoading] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpStatusMsg, setOtpStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !user) return;

    void (async () => {
      clearRoleIntent();
      if (user.role === "ADMIN" || user.email?.toLowerCase().startsWith("admin")) {
        router.replace("/admin");
      } else if (user.role === "VENDOR" || user.is_shop_owner) {
        try {
          await getMyShop();
          router.replace("/shop");
        } catch {
          router.replace("/shop/setup");
        }
      } else {
        router.replace("/deals");
      }
    })();
  }, [authLoading, isAuthenticated, user, router]);

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setError("");
    try {
      const res = await uploadAuthFile(file);
      setVendorPhotoUrl(res.url);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDocUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    setError("");
    try {
      const res = await uploadAuthFile(file);
      setVendorDocUrl(res.url);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleQuickLogin = async (emailToUse: string, passwordToUse: string, roleToSet: RoleMode) => {
    setRoleMode(roleToSet);
    setLoginEmail(emailToUse);
    setLoginPassword(passwordToUse);
    setError("");
    setSubmitting(true);
    try {
      const res = await login({ email: emailToUse, password: passwordToUse });
      loginUser(res.user, res.access_token);
      if (res.user.role === "ADMIN") {
        router.replace("/admin");
      } else if (res.user.role === "VENDOR" || res.user.is_shop_owner) {
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

  const handleSendOtp = async (targetId?: string) => {
    const idToSend = (targetId || otpIdentifier || loginEmail).trim();
    if (!idToSend) {
      setError("Please enter your email address to receive a login OTP code.");
      return;
    }
    setError("");
    setSendingOtp(true);
    setOtpStatusMsg(null);
    setOtpCode("");
    try {
      const res = await sendOtp(idToSend);
      setOtpIdentifier(idToSend);
      setOtpSent(true);
      setOtpCooldown(60);
      setTab("otp");
      setOtpStatusMsg({
        type: "success",
        text: `6-digit verification code sent to ${idToSend}. Please enter the code from your inbox.`,
      });
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setError(msg);
      setOtpStatusMsg({ type: "error", text: msg });
    } finally {
      setSendingOtp(false);
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
      const isVendorMode = roleMode === "vendor";
      const nameToSend = isVendorMode ? vendorShopName.trim() : customerName.trim();
      const res = await verifyOtp(
        otpIdentifier.trim(),
        otpCode.trim(),
        nameToSend || undefined,
        isVendorMode
      );
      loginUser(res.user, res.access_token);

      if (res.user.role === "ADMIN") {
        router.replace("/admin");
      } else if (res.user.role === "VENDOR" || res.user.is_shop_owner) {
        router.replace("/shop");
      } else {
        router.replace("/deals");
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setVerifyingOtpLoading(false);
    }
  };

  const handleSignupSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    setOtpCode("");

    try {
      if (roleMode === "customer") {
        if (customerPassword && customerPassword.length < 6) {
          setError("Password must be at least 6 characters long.");
          setSubmitting(false);
          return;
        }
        if (customerPassword && customerPassword !== customerConfirmPassword) {
          setError("Passwords do not match. Please re-enter your password.");
          setSubmitting(false);
          return;
        }

        const cleanEmail = customerEmail.trim().toLowerCase();
        await customerSignup({
          name: customerName.trim(),
          email: cleanEmail,
          password: customerPassword.trim() || undefined,
        });
        setOtpIdentifier(cleanEmail);
        setOtpSourceTab("signup");
        setOtpSent(true);
        setOtpCooldown(60);
        setTab("otp");
        setOtpStatusMsg({
          type: "success",
          text: `6-digit verification code sent to ${cleanEmail}. Please check your email inbox.`,
        });
      } else {
        // Vendor Signup with required document validation
        if (vendorPassword && vendorPassword.length < 6) {
          setError("Password must be at least 6 characters long.");
          setSubmitting(false);
          return;
        }
        if (vendorPassword && vendorPassword !== vendorConfirmPassword) {
          setError("Passwords do not match. Please re-enter your password.");
          setSubmitting(false);
          return;
        }

        if (!vendorPhotoUrl) {
          setError("Please upload a storefront photo before completing registration.");
          setSubmitting(false);
          return;
        }
        if (!vendorDocUrl) {
          setError("Please upload a business verification document (FSSAI/GST/Trade license) before completing registration.");
          setSubmitting(false);
          return;
        }

        const cleanEmail = vendorEmail.trim().toLowerCase();
        await vendorSignup({
          shop_name: vendorShopName.trim(),
          email: cleanEmail,
          phone_number: vendorPhone.trim(),
          password: vendorPassword.trim() || undefined,
          photo_url: vendorPhotoUrl,
          document_url: vendorDocUrl,
          address: vendorAddress.trim() || undefined,
          latitude: vendorLat,
          longitude: vendorLng,
        });
        setOtpIdentifier(cleanEmail);
        setOtpSourceTab("signup");
        setOtpSent(true);
        setOtpCooldown(60);
        setTab("otp");
        setOtpStatusMsg({
          type: "success",
          text: `Shop registered! 6-digit verification code sent to ${cleanEmail}. Location verification running in background.`,
        });
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const cleanEmail = loginEmail.trim().toLowerCase();
      const res = await login({ email: cleanEmail, password: loginPassword });
      loginUser(res.user, res.access_token);
      if (res.user.role === "ADMIN") {
        router.replace("/admin");
      } else if (res.user.role === "VENDOR" || res.user.is_shop_owner) {
        router.replace("/shop");
      } else {
        router.replace("/deals");
      }
    } catch (err: unknown) {
      const errMsg = getErrorMessage(err);
      // Auto-switch to OTP if account was registered via OTP or not verified yet
      if (
        errMsg.toLowerCase().includes("not verified") ||
        errMsg.toLowerCase().includes("verify your email") ||
        errMsg.toLowerCase().includes("via otp") ||
        errMsg.toLowerCase().includes("with otp") ||
        errMsg.toLowerCase().includes("verification code")
      ) {
        const targetEmail = loginEmail.trim().toLowerCase();
        setOtpIdentifier(targetEmail);
        setOtpSourceTab("login");
        setTab("otp");
        setOtpStatusMsg({
          type: "success",
          text: errMsg,
        });
      } else {
        setError(errMsg);
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
      {/* Brand Header */}
      <div className="w-full max-w-md bg-white/95 dark:bg-gray-900/90 backdrop-blur-2xl rounded-3xl border border-emerald-100/60 dark:border-gray-800 shadow-2xl p-6 sm:p-8 space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="bg-emerald-500 text-white p-2 rounded-2xl group-hover:scale-105 transition-transform shadow-md shadow-emerald-500/20">
              <Leaf size={24} />
            </div>
            <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Expiry<span className="text-emerald-500">Go</span>
            </span>
          </Link>
          <p className="text-xs font-semibold text-slate-500 dark:text-gray-400">
            {tab === "signup"
              ? "Create your Customer or Vendor Account"
              : tab === "otp"
              ? "Verify 6-digit OTP Code"
              : "Sign in to your account"}
          </p>
        </div>

        {/* Top Tab Switcher: Login vs Sign Up */}
        <div className="flex border-b border-emerald-100/60 dark:border-gray-800 p-1.5 bg-emerald-50/40 dark:bg-gray-900/50 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setError("");
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              tab === "login"
                ? "text-emerald-700 dark:text-emerald-400 bg-white dark:bg-gray-800 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("signup");
              setError("");
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              tab === "signup"
                ? "text-emerald-700 dark:text-emerald-400 bg-white dark:bg-gray-800 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Role Selector: Customer | Vendor | Admin */}
        {tab !== "otp" && (
          <div className="space-y-1">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-1.5">
              Select Role
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-gray-800/80 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setRoleMode("customer");
                  setError("");
                }}
                className={`flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  roleMode === "customer"
                    ? "bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <ShoppingBag size={14} /> Customer
              </button>
              <button
                type="button"
                onClick={() => {
                  setRoleMode("vendor");
                  setError("");
                }}
                className={`flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  roleMode === "vendor"
                    ? "bg-white dark:bg-gray-900 text-orange-600 dark:text-orange-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Store size={14} /> Vendor
              </button>
              {tab === "login" && (
                <button
                  type="button"
                  onClick={() => {
                    setRoleMode("admin");
                    setError("");
                  }}
                  className={`flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    roleMode === "admin"
                      ? "bg-white dark:bg-gray-900 text-purple-700 dark:text-purple-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Sparkles size={14} /> Admin
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB: OTP VERIFICATION */}
        {tab === "otp" && (
          <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                className="w-full text-center tracking-[12px] text-2xl font-black rounded-2xl border border-emerald-300 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3.5 outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="••••••"
              />
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
              <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={verifyingOtpLoading || otpCode.length < 4}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-2xl transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
            >
              {verifyingOtpLoading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
              Verify OTP & Complete Sign In
            </button>

            <div className="flex justify-between items-center pt-2 text-xs">
              <button
                type="button"
                onClick={() => setTab(otpSourceTab || "login")}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-white font-semibold cursor-pointer"
              >
                &larr; Back to {otpSourceTab === "signup" ? "Sign Up" : "Sign In"}
              </button>
              <button
                type="button"
                onClick={() => handleSendOtp()}
                disabled={sendingOtp || otpCooldown > 0}
                className="text-emerald-600 font-bold hover:underline disabled:opacity-50 cursor-pointer"
              >
                {sendingOtp ? "Sending..." : otpCooldown > 0 ? `Resend in ${otpCooldown}s` : "Resend OTP"}
              </button>
            </div>
          </form>
        )}

        {/* TAB: SIGN UP (CUSTOMER / VENDOR) */}
        {tab === "signup" && (
          <form onSubmit={handleSignupSubmit} className="space-y-4">
            {roleMode === "customer" ? (
              <>
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                    Customer Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-2xl border border-emerald-100 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-emerald-500 text-sm font-medium"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full rounded-2xl border border-emerald-100 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-emerald-500 text-sm font-medium"
                    placeholder="name@example.com"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                      Create Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showSignupPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={customerPassword}
                      onChange={(e) => setCustomerPassword(e.target.value)}
                      className="w-full rounded-2xl border border-emerald-100 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-emerald-500 text-sm font-medium"
                      placeholder="Min 6 characters"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showSignupPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={customerConfirmPassword}
                      onChange={(e) => setCustomerConfirmPassword(e.target.value)}
                      className="w-full rounded-2xl border border-emerald-100 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-emerald-500 text-sm font-medium"
                      placeholder="Repeat password"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    id="showCustPass"
                    checked={showSignupPassword}
                    onChange={(e) => setShowSignupPassword(e.target.checked)}
                    className="accent-emerald-600 rounded"
                  />
                  <label htmlFor="showCustPass" className="cursor-pointer">Show password text</label>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                    Shop / Store Name
                  </label>
                  <input
                    type="text"
                    required
                    value={vendorShopName}
                    onChange={(e) => setVendorShopName(e.target.value)}
                    className="w-full rounded-2xl border border-orange-200 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-orange-500 text-sm font-medium"
                    placeholder="e.g. Green Valley Supermarket"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                    Vendor Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={vendorEmail}
                    onChange={(e) => setVendorEmail(e.target.value)}
                    className="w-full rounded-2xl border border-orange-200 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-orange-500 text-sm font-medium"
                    placeholder="vendor@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={vendorPhone}
                    onChange={(e) => setVendorPhone(e.target.value)}
                    className="w-full rounded-2xl border border-orange-200 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-orange-500 text-sm font-medium"
                    placeholder="+91 9876543210"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                      Create Login Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showSignupPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={vendorPassword}
                      onChange={(e) => setVendorPassword(e.target.value)}
                      className="w-full rounded-2xl border border-orange-200 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-orange-500 text-sm font-medium"
                      placeholder="Min 6 characters"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showSignupPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={vendorConfirmPassword}
                      onChange={(e) => setVendorConfirmPassword(e.target.value)}
                      className="w-full rounded-2xl border border-orange-200 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-orange-500 text-sm font-medium"
                      placeholder="Repeat password"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    id="showVendPass"
                    checked={showSignupPassword}
                    onChange={(e) => setShowSignupPassword(e.target.checked)}
                    className="accent-orange-600 rounded"
                  />
                  <label htmlFor="showVendPass" className="cursor-pointer">Show password text</label>
                </div>

                {/* Upload Shop Photo */}
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                    Shop Storefront Photo <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-dashed ${vendorPhotoUrl ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-orange-300 dark:border-gray-700 hover:bg-orange-50 dark:hover:bg-gray-800"} cursor-pointer text-xs font-bold text-slate-600 dark:text-gray-300 transition`}>
                      <UploadCloud size={16} className={vendorPhotoUrl ? "text-emerald-500" : "text-orange-500"} />
                      {uploadingPhoto ? "Uploading Photo..." : vendorPhotoUrl ? "Storefront Photo Uploaded ✓" : "Upload Storefront Photo (Required)"}
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* Upload Shop Document */}
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                    Business License / FSSAI / GST Document <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-dashed ${vendorDocUrl ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-orange-300 dark:border-gray-700 hover:bg-orange-50 dark:hover:bg-gray-800"} cursor-pointer text-xs font-bold text-slate-600 dark:text-gray-300 transition`}>
                      <FileCheck size={16} className={vendorDocUrl ? "text-emerald-500" : "text-orange-500"} />
                      {uploadingDoc ? "Uploading Document..." : vendorDocUrl ? "Verification Doc Uploaded ✓" : "Upload Verification Doc (PDF/Image) *"}
                      <input type="file" accept=".pdf,image/*" onChange={handleDocUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* High Definition Interactive Live Map Location Picker */}
                <div className="pt-2">
                  <InteractiveLocationPicker
                    initialLat={vendorLat}
                    initialLng={vendorLng}
                    initialAddress={vendorAddress}
                    onLocationChange={({ lat, lng, address }) => {
                      setVendorLat(lat);
                      setVendorLng(lng);
                      setVendorAddress(address);
                    }}
                    label="Storefront Physical Location (Direct Live HD Map)"
                    required={true}
                  />
                </div>
              </>
            )}

            {error && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || uploadingPhoto || uploadingDoc}
              className={`w-full text-white font-black py-4 rounded-2xl transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm ${
                roleMode === "customer"
                  ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25"
                  : "bg-orange-600 hover:bg-orange-500 shadow-orange-500/25"
              }`}
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
              {roleMode === "customer" ? "Continue with OTP Verification" : "Register Store & Verify OTP"}
            </button>
          </form>
        )}

        {/* TAB: SIGN IN (PASSWORD vs 6-DIGIT OTP) */}
        {tab === "login" && (
          <div className="space-y-4">
            {/* Sign In Mode Switcher: Password vs OTP */}
            <div className="flex bg-slate-100 dark:bg-gray-800/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setLoginAuthType("password");
                  setError("");
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  loginAuthType === "password"
                    ? "bg-white dark:bg-gray-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Password Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginAuthType("otp");
                  setError("");
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  loginAuthType === "otp"
                    ? "bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                6-Digit OTP Sign In
              </button>
            </div>

            {loginAuthType === "password" ? (
              <form onSubmit={handlePasswordLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium"
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
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 pr-11 outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginAuthType("otp");
                        setError("");
                      }}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Zap size={12} /> Forgot password or created via OTP? Sign in via OTP
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full text-white font-black py-4 rounded-2xl transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm ${
                    roleMode === "admin"
                      ? "bg-purple-600 hover:bg-purple-500 shadow-purple-500/25"
                      : roleMode === "vendor"
                      ? "bg-orange-600 hover:bg-orange-500 shadow-orange-500/25"
                      : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25"
                  }`}
                >
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                  {roleMode === "admin" ? "Sign In to Admin Console" : "Sign In"}
                </button>
              </form>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setOtpSourceTab("login");
                  handleSendOtp(loginEmail);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                    Email Address to Receive OTP
                  </label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full rounded-2xl border border-emerald-200 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium"
                    placeholder="name@example.com"
                  />
                </div>

                {error && (
                  <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={sendingOtp}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
                >
                  {sendingOtp ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                  Send 6-Digit Login Code
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
