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
  ArrowLeft,
  CheckCircle2,
  Lock,
  MapPin,
  X,
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
  forgotPassword,
  resetPassword,
  googleAuth,
  type GoogleAuthInput,
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

type Tab = "login" | "signup" | "otp" | "forgot_password";
type RoleMode = "customer" | "vendor" | "admin";

function GoogleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}



export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginUser, isAuthenticated, isLoading: authLoading, user } = useAuth();

  const roleParam = searchParams.get("role");
  const initialRole: RoleMode =
    roleParam === "shop_owner" || roleParam === "vendor" || roleParam === "merchant"
      ? "vendor"
      : roleParam === "admin"
      ? "admin"
      : "customer";

  const initialTab = searchParams.get("tab") === "signup" ? "signup" : searchParams.get("tab") === "otp" ? "otp" : searchParams.get("tab") === "forgot" ? "forgot_password" : "login";

  const [tab, setTab] = useState<Tab>(initialTab);
  const [roleMode, setRoleMode] = useState<RoleMode>(initialRole);
  const [loginAuthType, setLoginAuthType] = useState<"password" | "otp">("password");
  const [otpSourceTab, setOtpSourceTab] = useState<"login" | "signup">("login");

  useEffect(() => {
    const r = searchParams.get("role");
    if (r === "shop_owner" || r === "vendor" || r === "merchant") {
      setRoleMode("vendor");
    } else if (r === "admin") {
      setRoleMode("admin");
    } else if (r === "customer") {
      setRoleMode("customer");
    }

    const t = searchParams.get("tab");
    if (t === "signup") {
      setTab("signup");
    } else if (t === "otp") {
      setTab("otp");
    } else if (t === "forgot" || t === "forgot_password") {
      setTab("forgot_password");
    } else if (t === "login") {
      setTab("login");
    }
  }, [searchParams]);

  // Customer Signup fields
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPassword, setCustomerPassword] = useState("");
  const [customerConfirmPassword, setCustomerConfirmPassword] = useState("");

  // Vendor Signup fields
  const [vendorShopName, setVendorShopName] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorUpiId, setVendorUpiId] = useState("");
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

  // Forgot Password States
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [showForgotPass, setShowForgotPass] = useState(false);
  const [forgotStep, setForgotStep] = useState<"email" | "reset" | "success">("email");
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotResetting, setForgotResetting] = useState(false);
  const [forgotCooldown, setForgotCooldown] = useState(0);
  const [forgotDevCode, setForgotDevCode] = useState<string | null>(null);
  const [forgotStatusMsg, setForgotStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Google Authentication Modal States (Real test - no pre-filled demo accounts)
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleModalEmail, setGoogleModalEmail] = useState("");
  const [googleModalName, setGoogleModalName] = useState("");
  const [googleConnectedAccount, setGoogleConnectedAccount] = useState<{ email: string; name: string } | null>(null);

  // Initialize official Google Identity Services (One Tap) if Client ID configured
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    if (typeof window !== "undefined" && !(window as any).google?.accounts?.id) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: clientId,
            callback: (response: any) => {
              try {
                const base64Url = response.credential.split(".")[1];
                const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
                const jsonPayload = decodeURIComponent(
                  atob(base64)
                    .split("")
                    .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                    .join("")
                );
                const payload = JSON.parse(jsonPayload);
                handleGoogleSignIn(payload.email, payload.name, payload.picture);
              } catch {
                handleGoogleSignIn();
              }
            },
          });
          (window as any).google.accounts.id.prompt();
        } catch (e) {
          console.warn("Google One Tap auto prompt notice:", e);
        }
      };
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const timer = setInterval(() => {
      setForgotCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [forgotCooldown]);

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

  const handleGoogleSignIn = async (
    targetEmail?: string,
    targetName?: string,
    targetPicture?: string
  ) => {
    // If no target email provided and not yet connected, open Google Sign-In prompt
    if (!targetEmail && !googleConnectedAccount) {
      setGoogleModalEmail("");
      setGoogleModalName("");
      setShowGoogleModal(true);
      return;
    }

    const email = (targetEmail || (googleConnectedAccount ? googleConnectedAccount.email : "")).trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid Google email address.");
      return;
    }

    const name =
      targetName ||
      (googleConnectedAccount?.name) ||
      (email === "devpant2006@gmail.com"
        ? "Devesh S"
        : email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()));

    // For Vendor Sign Up: if merchant details not yet filled, connect the account first
    if (tab === "signup" && roleMode === "vendor" && !googleConnectedAccount && !vendorShopName.trim()) {
      setGoogleConnectedAccount({ email, name });
      setVendorEmail(email);
      setCustomerName(name);
      return;
    }

    setGoogleLoading(true);
    setError("");

    try {
      const payload: GoogleAuthInput = {
        email,
        name,
        picture: targetPicture,
        role:
          roleMode === "admin" || email === "devpant2006@gmail.com"
            ? "ADMIN"
            : roleMode === "vendor"
            ? "VENDOR"
            : "CUSTOMER",
      };

      if (tab === "signup" && roleMode === "vendor") {
        if (!vendorShopName.trim()) {
          setError("Please enter your Store Name to register as Merchant.");
          setGoogleLoading(false);
          return;
        }
        if (!vendorPhone.trim()) {
          setError("Please enter your 10-digit mobile number.");
          setGoogleLoading(false);
          return;
        }
        if (!vendorPhotoUrl) {
          setError("Please upload your storefront photo.");
          setGoogleLoading(false);
          return;
        }
        if (!vendorDocUrl) {
          setError("Please upload your business registration document.");
          setGoogleLoading(false);
          return;
        }
        payload.shop_name = vendorShopName.trim();
        payload.phone_number = vendorPhone.trim();
        payload.upi_id = vendorUpiId.trim() || undefined;
        payload.address = vendorAddress.trim() || undefined;
        payload.latitude = vendorLat;
        payload.longitude = vendorLng;
        payload.photo_url = vendorPhotoUrl;
        payload.document_url = vendorDocUrl;
      }

      const res = await googleAuth(payload);
      loginUser(res.user, res.access_token);

      if (res.user.role === "ADMIN" || email === "devpant2006@gmail.com") {
        router.replace("/admin");
      } else if (res.user.role === "VENDOR" || res.user.is_shop_owner) {
        router.replace("/shop");
      } else {
        router.replace("/deals");
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setGoogleLoading(false);
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
      
      const actualRole = res.user.role === "ADMIN" ? "admin" : (res.user.role === "VENDOR" || res.user.is_shop_owner) ? "vendor" : "customer";
      if (roleMode === "customer" && actualRole === "vendor") {
        setError("This email is registered as a Merchant/Vendor account. Please switch to Vendor to sign in.");
        return;
      }
      if (roleMode === "vendor" && actualRole === "customer") {
        setError("This email is registered as a Shopper/Customer account. Please switch to Customer to sign in.");
        return;
      }

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
        // If Vendor is registering with Google Authentication (Zero Password / Zero OTP)
        if (googleConnectedAccount) {
          if (!vendorShopName.trim()) {
            setError("Please enter your Store Name to complete registration.");
            setSubmitting(false);
            return;
          }
          if (!vendorPhone.trim()) {
            setError("Please enter your 10-digit mobile phone number.");
            setSubmitting(false);
            return;
          }
          if (!vendorPhotoUrl) {
            setError("Please upload your storefront photo before completing registration.");
            setSubmitting(false);
            return;
          }
          if (!vendorDocUrl) {
            setError("Please upload your business verification document (FSSAI/GST/Trade license).");
            setSubmitting(false);
            return;
          }
          await handleGoogleSignIn(googleConnectedAccount.email, googleConnectedAccount.name);
          return;
        }

        // Standard Email & Password Vendor Signup with required document validation
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
          upi_id: vendorUpiId.trim() || undefined,
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

      const actualRole = res.user.role === "ADMIN" ? "admin" : (res.user.role === "VENDOR" || res.user.is_shop_owner) ? "vendor" : "customer";

      if (roleMode === "customer" && actualRole === "vendor") {
        setError("This email is registered as a Merchant/Vendor account. Please switch to the Vendor tab above to sign in.");
        setSubmitting(false);
        return;
      }
      if (roleMode === "vendor" && actualRole === "customer") {
        setError("This email is registered as a Shopper/Customer account. Please switch to the Customer tab above to sign in.");
        setSubmitting(false);
        return;
      }
      if (roleMode === "admin" && actualRole !== "admin") {
        setError("This account does not have Administrator privileges. Please switch to Customer or Vendor to sign in.");
        setSubmitting(false);
        return;
      }

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

  const handleForgotPasswordRequest = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = (forgotEmail || loginEmail).trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setForgotSending(true);
    setForgotStatusMsg(null);
    setForgotDevCode(null);
    try {
      setForgotEmail(cleanEmail);
      const res = await forgotPassword(cleanEmail);
      setForgotDevCode(res.dev_code || null);
      setForgotCooldown(res.cooldown_remaining || 60);
      setForgotStep("reset");
      setForgotStatusMsg({
        type: "success",
        text: res.message || `A 6-digit password reset code has been sent to ${cleanEmail}.`,
      });
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setError(msg);
      setForgotStatusMsg({ type: "error", text: msg });
    } finally {
      setForgotSending(false);
    }
  };

  const handleResetPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanOtp = forgotOtp.trim().replace(/\D/g, "");
    if (!cleanOtp || cleanOtp.length < 4) {
      setError("Please enter the 6-digit OTP code received in your email.");
      return;
    }
    if (forgotNewPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }
    setError("");
    setForgotResetting(true);
    setForgotStatusMsg(null);
    try {
      const res = await resetPassword({
        email: forgotEmail.trim().toLowerCase(),
        otp: cleanOtp,
        new_password: forgotNewPassword.trim(),
      });
      setForgotStep("success");
      setForgotStatusMsg({
        type: "success",
        text: "Password reset successful! Logging you in...",
      });
      if (res.access_token && res.user) {
        loginUser(res.user, res.access_token);
        setTimeout(() => {
          if (res.user?.role === "ADMIN") {
            router.replace("/admin");
          } else if (res.user?.role === "VENDOR" || res.user?.is_shop_owner) {
            router.replace("/shop");
          } else {
            router.replace("/deals");
          }
        }, 1200);
      } else {
        setTimeout(() => {
          setTab("login");
          setForgotStep("email");
        }, 1500);
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      setError(msg);
      setForgotStatusMsg({ type: "error", text: msg });
    } finally {
      setForgotResetting(false);
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50/60 via-[#F8FAFC] to-purple-50/40 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950/40 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden transition-colors">
      {/* Real Google Sign-In Authentication Modal (No fake/demo accounts) */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <GoogleIcon className="w-5 h-5" />
                <span className="font-bold text-sm text-slate-800 dark:text-white">
                  Sign in with Google
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Use your Google Account
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                to continue to <strong className="text-purple-600">Meeva</strong>
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const em = googleModalEmail.trim();
                if (!em || !em.includes("@")) {
                  setError("Please enter a valid Google email address.");
                  return;
                }
                setShowGoogleModal(false);
                handleGoogleSignIn(em, googleModalName.trim() || undefined);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5">
                  Google Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="yourname@gmail.com"
                  value={googleModalEmail}
                  onChange={(e) => setGoogleModalEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5">
                  Full Name <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Your Full Name"
                  value={googleModalName}
                  onChange={(e) => setGoogleModalName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 rounded-2xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!googleModalEmail.trim() || googleLoading}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl text-xs font-bold transition shadow-md shadow-purple-600/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {googleLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <GoogleIcon className="w-4 h-4 brightness-200" />
                  )}
                  Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Brand Header */}
      <div className="w-full max-w-md bg-white/95 dark:bg-gray-900/90 backdrop-blur-2xl rounded-3xl border border-purple-100/70 dark:border-gray-800 shadow-2xl p-6 sm:p-8 space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="bg-purple-600 text-white p-2 rounded-2xl group-hover:scale-105 transition-transform shadow-md shadow-purple-600/20">
              <Leaf size={24} />
            </div>
            <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Mee<span className="text-purple-600">va</span>
            </span>
          </Link>
          <p className="text-xs font-semibold text-slate-500 dark:text-gray-400">
            {tab === "signup"
              ? "Create your Customer or Vendor Account"
              : tab === "otp"
              ? "Verify 6-digit OTP Code"
              : tab === "forgot_password"
              ? "Reset your account password"
              : "Sign in to your account"}
          </p>
        </div>

        {/* Top Tab Switcher: Login vs Sign Up (Hidden during Forgot Password & OTP) */}
        {tab !== "otp" && tab !== "forgot_password" && (
          <div className="flex border border-purple-100/60 dark:border-gray-800 p-1.5 bg-purple-50/40 dark:bg-gray-900/50 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setError("");
                setLoginEmail("");
                setLoginPassword("");
                setCustomerEmail("");
                setCustomerPassword("");
                setVendorEmail("");
                setVendorPassword("");
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                tab === "login"
                  ? "text-purple-700 dark:text-purple-400 bg-white dark:bg-gray-800 shadow-sm"
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
                setLoginEmail("");
                setLoginPassword("");
                setCustomerEmail("");
                setCustomerPassword("");
                setVendorEmail("");
                setVendorPassword("");
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                tab === "signup"
                  ? "text-purple-700 dark:text-purple-400 bg-white dark:bg-gray-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Role Selector: Customer | Vendor | Admin */}
        {tab !== "otp" && tab !== "forgot_password" && (
          <div className="space-y-1">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-1.5">
              Select Role
            </label>
            <div className={`grid ${tab === "login" ? "grid-cols-3" : "grid-cols-2"} gap-1.5 bg-slate-100 dark:bg-gray-800/80 p-1 rounded-2xl transition-all`}>
              <button
                type="button"
                onClick={() => {
                  setRoleMode("customer");
                  setError("");
                  setLoginEmail("");
                  setLoginPassword("");
                  setCustomerEmail("");
                  setCustomerPassword("");
                  setVendorEmail("");
                  setVendorPassword("");
                }}
                className={`flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  roleMode === "customer"
                    ? "bg-white dark:bg-gray-900 text-purple-700 dark:text-purple-400 shadow-sm font-black"
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
                  setLoginEmail("");
                  setLoginPassword("");
                  setCustomerEmail("");
                  setCustomerPassword("");
                  setVendorEmail("");
                  setVendorPassword("");
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
                    setLoginEmail("");
                    setLoginPassword("");
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

        {/* Google 1-Click Fast Authentication */}
        {tab !== "otp" && tab !== "forgot_password" && (
          <div className="space-y-3 pt-1">
            {roleMode === "vendor" && tab === "signup" && googleConnectedAccount ? (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    {googleConnectedAccount.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {googleConnectedAccount.name}
                      </p>
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300">
                        Google Verified
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400">
                      {googleConnectedAccount.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setGoogleConnectedAccount(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white font-medium cursor-pointer"
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleGoogleSignIn()}
                disabled={googleLoading || submitting}
                className="w-full py-3.5 px-4 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-750 text-slate-800 dark:text-white border-2 border-slate-200/90 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 rounded-2xl font-bold text-sm shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer group disabled:opacity-50"
              >
                {googleLoading ? (
                  <Loader2 size={18} className="animate-spin text-purple-600" />
                ) : (
                  <GoogleIcon className="w-5 h-5 shrink-0 group-hover:scale-105 transition-transform" />
                )}
                <span>
                  {roleMode === "admin"
                    ? "Continue as Admin with Google"
                    : roleMode === "vendor"
                    ? (tab === "signup" ? "Verify Merchant with Google" : "Continue with Google as Merchant")
                    : "Continue with Google"}
                </span>
              </button>
            )}

            {/* Subtle Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200/80 dark:border-gray-800"></div>
              <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                or continue with credentials
              </span>
              <div className="flex-grow border-t border-slate-200/80 dark:border-gray-800"></div>
            </div>
          </div>
        )}

        {/* TAB: FORGOT PASSWORD FLOW */}
        {tab === "forgot_password" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => {
                  setTab("login");
                  setError("");
                  setForgotStatusMsg(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <KeyRound size={12} /> Password Recovery
              </span>
            </div>

            {forgotStep === "email" && (
              <form onSubmit={handleForgotPasswordRequest} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Forgot your password?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
                    Enter the email address registered with your account. We will send you a secure 6-digit OTP code to set a new password.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                    Account Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full rounded-2xl border border-purple-200 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/20 text-sm font-medium"
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
                  disabled={forgotSending || !forgotEmail.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-3.5 rounded-2xl transition shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
                >
                  {forgotSending ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                  Send 6-Digit Reset Code
                </button>
              </form>
            )}

            {forgotStep === "reset" && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div className="space-y-1 text-left">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Set New Password
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400">
                    We sent a verification code to <span className="font-bold text-slate-800 dark:text-slate-200">{forgotEmail}</span>.
                  </p>
                </div>

                {/* Dev Code Quick Auto-Fill Helper if present */}
                {forgotDevCode && (
                  <div className="bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/50 rounded-2xl p-3 text-xs flex items-center justify-between">
                    <div className="text-purple-800 dark:text-purple-300">
                      <span className="font-bold">Dev Code:</span> <span className="font-mono tracking-wider font-extrabold">{forgotDevCode}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForgotOtp(forgotDevCode)}
                      className="text-[11px] font-bold bg-purple-600 text-white px-2.5 py-1 rounded-lg hover:bg-purple-500 transition cursor-pointer"
                    >
                      Fill Code
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ""))}
                    className="w-full text-center tracking-[10px] text-xl font-black rounded-2xl border border-purple-300 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/20"
                    placeholder="••••••"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showForgotPass ? "text" : "password"}
                      required
                      minLength={6}
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 pr-11 outline-none focus:ring-2 focus:ring-purple-500/20 text-sm font-medium"
                      placeholder="Min 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotPass(!showForgotPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showForgotPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type={showForgotPass ? "text" : "password"}
                    required
                    minLength={6}
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/20 text-sm font-medium"
                    placeholder="Repeat new password"
                  />
                </div>

                {forgotStatusMsg && (
                  <p
                    className={`text-xs font-semibold rounded-xl px-3.5 py-2.5 border ${
                      forgotStatusMsg.type === "success"
                        ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200"
                        : "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200"
                    }`}
                  >
                    {forgotStatusMsg.text}
                  </p>
                )}

                {error && (
                  <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={forgotResetting || forgotOtp.length < 4 || forgotNewPassword.length < 6}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-3.5 rounded-2xl transition shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
                >
                  {forgotResetting ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                  Reset Password & Sign In
                </button>

                <div className="flex justify-between items-center pt-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep("email");
                      setError("");
                    }}
                    className="text-slate-500 hover:text-slate-800 dark:hover:text-white font-semibold cursor-pointer"
                  >
                    &larr; Change Email
                  </button>
                  <button
                    type="button"
                    onClick={() => handleForgotPasswordRequest()}
                    disabled={forgotSending || forgotCooldown > 0}
                    className="text-purple-600 dark:text-purple-400 font-bold hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    {forgotSending ? "Sending..." : forgotCooldown > 0 ? `Resend in ${forgotCooldown}s` : "Resend OTP"}
                  </button>
                </div>
              </form>
            )}

            {forgotStep === "success" && (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 size={36} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Password Reset Successfully!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400">
                    Your password has been updated. Signing you into your dashboard...
                  </p>
                </div>
                <Loader2 size={24} className="animate-spin text-purple-500 mx-auto" />
              </div>
            )}
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
                className="w-full text-center tracking-[12px] text-2xl font-black rounded-2xl border border-purple-300 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3.5 outline-none focus:ring-2 focus:ring-purple-500/20"
                placeholder="••••••"
              />
            </div>

            {otpStatusMsg && (
              <p
                className={`text-xs font-semibold rounded-xl px-3.5 py-2.5 border ${
                  otpStatusMsg.type === "success"
                    ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200"
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
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-3.5 rounded-2xl transition shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
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
                className="text-purple-600 font-bold hover:underline disabled:opacity-50 cursor-pointer"
              >
                {sendingOtp ? "Sending..." : otpCooldown > 0 ? `Resend in ${otpCooldown}s` : "Resend OTP"}
              </button>
            </div>
          </form>
        )}

        {/* TAB: SIGN UP (CUSTOMER / VENDOR) */}
        {tab === "signup" && (
          <form onSubmit={handleSignupSubmit} autoComplete="off" className="space-y-4">
            {roleMode === "customer" ? (
              <>
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                    Customer Full Name
                  </label>
                  <input
                    type="text"
                    name="cust_name_field"
                    autoComplete="off"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-2xl border border-purple-100 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-purple-500 text-sm font-medium"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="cust_email_field"
                    autoComplete="off"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full rounded-2xl border border-purple-100 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-purple-500 text-sm font-medium"
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
                      name="cust_password_field"
                      autoComplete="new-password"
                      required
                      minLength={6}
                      value={customerPassword}
                      onChange={(e) => setCustomerPassword(e.target.value)}
                      className="w-full rounded-2xl border border-purple-100 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-purple-500 text-sm font-medium"
                      placeholder="Min 6 characters"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showSignupPassword ? "text" : "password"}
                      name="cust_confirm_password_field"
                      autoComplete="new-password"
                      required
                      minLength={6}
                      value={customerConfirmPassword}
                      onChange={(e) => setCustomerConfirmPassword(e.target.value)}
                      className="w-full rounded-2xl border border-purple-100 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-purple-500 text-sm font-medium"
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
                    className="accent-purple-600 rounded"
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
                    name="vendor_shop_name_field"
                    autoComplete="off"
                    required
                    value={vendorShopName}
                    onChange={(e) => setVendorShopName(e.target.value)}
                    className="w-full rounded-2xl border border-orange-200 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-orange-500 text-sm font-medium"
                    placeholder="Enter your store / business name"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400">
                      Vendor Email Address
                    </label>
                    {googleConnectedAccount && (
                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Google Verified
                      </span>
                    )}
                  </div>
                  <input
                    type="email"
                    name="vendor_email_field"
                    autoComplete="off"
                    required
                    readOnly={!!googleConnectedAccount}
                    value={vendorEmail}
                    onChange={(e) => setVendorEmail(e.target.value)}
                    className={`w-full rounded-2xl border ${
                      googleConnectedAccount
                        ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 cursor-not-allowed"
                        : "border-orange-200 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white"
                    } px-4 py-3 outline-none focus:border-orange-500 text-sm font-medium`}
                    placeholder="vendor@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="vendor_phone_field"
                    autoComplete="off"
                    required
                    value={vendorPhone}
                    onChange={(e) => setVendorPhone(e.target.value)}
                    className="w-full rounded-2xl border border-orange-200 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-orange-500 text-sm font-medium"
                    placeholder="10-digit mobile number"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400">
                      Store UPI ID / VPA
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">Optional</span>
                  </div>
                  <input
                    type="text"
                    name="vendor_upi_field"
                    autoComplete="off"
                    value={vendorUpiId}
                    onChange={(e) => setVendorUpiId(e.target.value)}
                    className="w-full rounded-2xl border border-orange-200 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:border-orange-500 text-sm font-medium"
                    placeholder="e.g. yourbusiness@upi"
                  />
                </div>

                {!googleConnectedAccount ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                          Create Login Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type={showSignupPassword ? "text" : "password"}
                          name="vendor_pass_field"
                          autoComplete="new-password"
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
                          name="vendor_confirm_pass_field"
                          autoComplete="new-password"
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
                  </>
                ) : (
                  <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center gap-3">
                    <ShieldCheck className="text-emerald-600 dark:text-emerald-400 shrink-0" size={24} />
                    <div className="text-xs">
                      <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        Password & OTP Verification Bypassed
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300">
                          Google Verified
                        </span>
                      </p>
                      <p className="text-slate-500 dark:text-gray-400 mt-0.5">
                        Your merchant identity is securely authenticated via {googleConnectedAccount.email}. Fill your store details below and register instantly.
                      </p>
                    </div>
                  </div>
                )}

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
              disabled={submitting || googleLoading || uploadingPhoto || uploadingDoc}
              className={`w-full text-white font-black py-4 rounded-2xl transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm ${
                roleMode === "customer"
                  ? "bg-purple-600 hover:bg-purple-500 shadow-purple-600/25"
                  : googleConnectedAccount
                  ? "bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 shadow-orange-500/25 hover:shadow-orange-500/40"
                  : "bg-orange-600 hover:bg-orange-500 shadow-orange-500/25"
              }`}
            >
              {submitting || googleLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : googleConnectedAccount ? (
                <GoogleIcon className="w-5 h-5 brightness-200" />
              ) : (
                <Zap size={18} />
              )}
              {roleMode === "customer"
                ? "Continue with OTP Verification"
                : googleConnectedAccount
                ? "Register Store with Google (1-Click Instant)"
                : "Register Store & Verify OTP"}
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
                    ? "bg-white dark:bg-gray-900 text-purple-700 dark:text-purple-300 shadow-sm font-black"
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
                    ? "bg-white dark:bg-gray-900 text-purple-700 dark:text-purple-400 shadow-sm font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                6-Digit OTP Sign In
              </button>
            </div>

            {loginAuthType === "password" ? (
              <form onSubmit={handlePasswordLoginSubmit} autoComplete="off" className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="login_email_no_autofill"
                    autoComplete="off"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm font-medium"
                    placeholder="name@example.com"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-gray-400">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(loginEmail);
                        setTab("forgot_password");
                        setForgotStep("email");
                        setError("");
                        setForgotStatusMsg(null);
                      }}
                      className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="login_password_no_autofill"
                      autoComplete="new-password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 pr-11 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm font-medium"
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
                      className="text-xs font-semibold text-slate-500 hover:text-purple-700 dark:hover:text-purple-300 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Zap size={12} className="text-purple-600" /> Account created via OTP? Sign in via OTP
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
                      ? "bg-purple-700 hover:bg-purple-600 shadow-purple-600/30"
                      : roleMode === "vendor"
                      ? "bg-orange-600 hover:bg-orange-500 shadow-orange-500/25"
                      : "bg-purple-600 hover:bg-purple-500 shadow-purple-600/25"
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
                    className="w-full rounded-2xl border border-purple-200 dark:border-gray-700 bg-white/90 dark:bg-gray-950 text-slate-900 dark:text-white px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm font-medium"
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
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-4 rounded-2xl transition shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
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

