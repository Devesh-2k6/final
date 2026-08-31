"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Store,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  MapPin,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  ShoppingBag,
  RefreshCw,
  Eye,
  Info,
  Building2,
  Lock,
  FileText,
} from "lucide-react";
import {
  getAllShops,
  getAdminStats,
  approveShop,
  rejectShop,
  suspendShop,
  reactivateShop,
  type AdminShop,
  type AdminStats,
} from "@/services/admin";
import { useAuth } from "@/contexts/AuthenticationContext";
import { getErrorMessage } from "@/api/errors";
import { getPublicApiBaseUrl } from "@/config/env";
import Link from "next/link";

type TabFilter = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" | "ALL";

function getFullMediaUrl(url?: string | null): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const base = getPublicApiBaseUrl();
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

export default function AdminDashboardPage() {
  const { user: currentUser } = useAuth();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [shops, setShops] = useState<AdminShop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedShopForReject, setSelectedShopForReject] = useState<AdminShop | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");

  // Toast State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsData, shopsData] = await Promise.all([
        getAdminStats().catch(() => null),
        getAllShops().catch(() => []),
      ]);
      if (statsData) setStats(statsData);
      setShops(shopsData);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleApprove = async (shop: AdminShop) => {
    if (!confirm(`Are you sure you want to APPROVE '${shop.name}' and activate live selling?`)) return;
    setActionLoading(shop.id);
    try {
      await approveShop(shop.id);
      showToast(`Shop '${shop.name}' has been APPROVED and activated!`);
      await loadData();
    } catch (err: unknown) {
      showToast(getErrorMessage(err) || "Failed to approve shop.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenRejectModal = (shop: AdminShop) => {
    setSelectedShopForReject(shop);
    setRejectReason("Business could not be sufficiently verified as a legitimate food-selling shop.");
    setRejectError("");
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopForReject) return;
    if (!rejectReason.trim() || rejectReason.trim().length < 3) {
      setRejectError("Please enter a valid rejection reason (min 3 characters).");
      return;
    }

    setActionLoading(selectedShopForReject.id);
    try {
      await rejectShop(selectedShopForReject.id, rejectReason.trim());
      showToast(`Shop '${selectedShopForReject.name}' application REJECTED.`);
      setRejectModalOpen(false);
      setSelectedShopForReject(null);
      await loadData();
    } catch (err: unknown) {
      setRejectError(getErrorMessage(err) || "Failed to reject shop.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (shop: AdminShop) => {
    const reason = prompt(`Enter reason for suspending '${shop.name}':`, "Policy review / temporary suspension");
    if (reason === null) return;
    setActionLoading(shop.id);
    try {
      await suspendShop(shop.id, reason);
      showToast(`Shop '${shop.name}' suspended.`);
      await loadData();
    } catch (err: unknown) {
      showToast(getErrorMessage(err) || "Failed to suspend shop.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async (shop: AdminShop) => {
    if (!confirm(`Reactivate shop '${shop.name}'?`)) return;
    setActionLoading(shop.id);
    try {
      await reactivateShop(shop.id);
      showToast(`Shop '${shop.name}' reactivated!`);
      await loadData();
    } catch (err: unknown) {
      showToast(getErrorMessage(err) || "Failed to reactivate shop.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // RBAC check
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.email?.toLowerCase().startsWith("admin");

  if (currentUser && !isAdmin) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-950/40 text-red-600 rounded-3xl mx-auto flex items-center justify-center">
          <Lock size={32} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Admin Privileges Required</h2>
        <p className="text-sm text-slate-600 dark:text-gray-400">
          Your current account (<span className="font-semibold">{currentUser.email}</span>) does not have administrator access.
        </p>
        <Link
          href="/auth?tab=login"
          className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-2xl transition"
        >
          Switch to Admin Account (admin@test.com)
        </Link>
      </div>
    );
  }

  const filteredShops = shops.filter((shop) => {
    const matchesTab = activeTab === "ALL" ? true : shop.approval_status === activeTab;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      shop.name.toLowerCase().includes(q) ||
      (shop.owner_email && shop.owner_email.toLowerCase().includes(q)) ||
      (shop.owner_name && shop.owner_name.toLowerCase().includes(q)) ||
      (shop.address && shop.address.toLowerCase().includes(q)) ||
      (shop.location_verification_category && shop.location_verification_category.toLowerCase().includes(q));
    return matchesTab && matchesSearch;
  });

  const pendingCount = shops.filter((s) => s.approval_status === "PENDING").length;
  const approvedCount = shops.filter((s) => s.approval_status === "APPROVED").length;
  const rejectedCount = shops.filter((s) => s.approval_status === "REJECTED").length;
  const suspendedCount = shops.filter((s) => s.approval_status === "SUSPENDED").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-2 border animate-in slide-in-from-bottom-5 ${
            toastMessage.type === "success"
              ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/30"
              : "bg-red-600 text-white border-red-500 shadow-red-600/30"
          }`}
        >
          {toastMessage.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          {toastMessage.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-wider">
            <ShieldCheck size={16} /> Trust & Moderation Console
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            Merchant Food-Shop Approvals
          </h1>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
            Review submitted shops, verify OpenStreetMap food business credentials, and approve or reject sellers.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-sm font-bold text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700 active:scale-95 transition shadow-sm"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-amber-200/60 dark:border-amber-900/40 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Pending Queue
            </span>
            <div className="p-2 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {stats?.pending_shops ?? pendingCount}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-semibold">
            Requires Admin Review & Verification
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-emerald-200/60 dark:border-emerald-900/40 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Active Food Stores
            </span>
            <div className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Store size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {stats?.active_shops ?? approvedCount}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
            Live on Customer Deals Feed
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-blue-200/60 dark:border-blue-900/40 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Registered Accounts
            </span>
            <div className="p-2 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {stats?.total_users ?? 0}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-semibold">
            {stats?.total_merchants ?? 0} Merchants • {stats?.total_customers ?? 0} Customers
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-orange-200/60 dark:border-orange-900/40 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-orange-700 dark:text-orange-400">
              Live Surplus Deals
            </span>
            <div className="p-2 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <ShoppingBag size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">
            {stats?.total_deals ?? 0}
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-semibold">
            Rescuing Quality Food from Waste
          </p>
        </div>
      </div>

      {/* Main Review Section */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-slate-200/80 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Controls: Tabs & Search */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 md:items-center justify-between bg-slate-50/50 dark:bg-gray-850">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab("PENDING")}
              className={`px-4 py-2 rounded-2xl text-xs font-black tracking-wider uppercase transition flex items-center gap-2 ${
                activeTab === "PENDING"
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/25"
                  : "bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 border border-slate-200 dark:border-gray-700"
              }`}
            >
              Pending Review
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === "PENDING" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"}`}>
                {pendingCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("APPROVED")}
              className={`px-4 py-2 rounded-2xl text-xs font-black tracking-wider uppercase transition flex items-center gap-2 ${
                activeTab === "APPROVED"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                  : "bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 border border-slate-200 dark:border-gray-700"
              }`}
            >
              Approved
              <span className="text-[10px] opacity-75">({approvedCount})</span>
            </button>

            <button
              onClick={() => setActiveTab("REJECTED")}
              className={`px-4 py-2 rounded-2xl text-xs font-black tracking-wider uppercase transition flex items-center gap-2 ${
                activeTab === "REJECTED"
                  ? "bg-red-600 text-white shadow-md shadow-red-600/25"
                  : "bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 border border-slate-200 dark:border-gray-700"
              }`}
            >
              Rejected
              <span className="text-[10px] opacity-75">({rejectedCount})</span>
            </button>

            <button
              onClick={() => setActiveTab("SUSPENDED")}
              className={`px-4 py-2 rounded-2xl text-xs font-black tracking-wider uppercase transition flex items-center gap-2 ${
                activeTab === "SUSPENDED"
                  ? "bg-slate-700 text-white shadow-md"
                  : "bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 border border-slate-200 dark:border-gray-700"
              }`}
            >
              Suspended
              <span className="text-[10px] opacity-75">({suspendedCount})</span>
            </button>

            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-4 py-2 rounded-2xl text-xs font-black tracking-wider uppercase transition ${
                activeTab === "ALL"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md"
                  : "bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 border border-slate-200 dark:border-gray-700"
              }`}
            >
              All ({shops.length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search shop, email, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-2xl pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-medium"
            />
          </div>
        </div>

        {/* List Content */}
        {isLoading ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="animate-spin text-emerald-500" size={32} />
            <p className="text-sm font-semibold">Loading merchant verification queue...</p>
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <div className="w-12 h-12 bg-slate-100 dark:bg-gray-700 rounded-2xl mx-auto flex items-center justify-center text-slate-500">
              <Store size={24} />
            </div>
            <p className="text-base font-bold text-slate-800 dark:text-gray-200">No shops in this queue</p>
            <p className="text-xs text-slate-500">All submitted shops have been reviewed or no results matched your search.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-gray-700/60">
            {filteredShops.map((shop) => {
              const isPending = shop.approval_status === "PENDING";
              const isApproved = shop.approval_status === "APPROVED";
              const isRejected = shop.approval_status === "REJECTED";
              const isSuspended = shop.approval_status === "SUSPENDED";
              const isCurrentActionLoading = actionLoading === shop.id;

              return (
                <div key={shop.id} className="p-5 sm:p-6 hover:bg-slate-50/70 dark:hover:bg-gray-750 transition-colors space-y-4">
                  {/* Top Row: Name, Status & Primary Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                          {shop.name}
                        </h3>

                        {/* Status Badge */}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 uppercase">
                            <Clock size={12} /> Pending Approval
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 uppercase">
                            <CheckCircle2 size={12} /> Approved & Active
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800/60 uppercase">
                            <XCircle size={12} /> Rejected
                          </span>
                        )}
                        {isSuspended && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-600 uppercase">
                            <AlertTriangle size={12} /> Suspended
                          </span>
                        )}

                        {/* Food Category Tag */}
                        {shop.location_verification_category && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300 capitalize">
                            🏷️ {shop.location_verification_category.replace("_", " ")}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-gray-300 font-medium">
                        Owner: <span className="font-bold text-slate-900 dark:text-white">{shop.owner_name || "Merchant"}</span> • Email: <span className="font-bold text-emerald-600 dark:text-emerald-400">{shop.owner_email}</span> {shop.owner_phone && `• Tel: ${shop.owner_phone}`}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap sm:self-start">
                      {isPending && (
                        <>
                          <button
                            onClick={() => handleApprove(shop)}
                            disabled={isCurrentActionLoading}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black transition shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                          >
                            {isCurrentActionLoading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                            Approve Shop
                          </button>
                          <button
                            onClick={() => handleOpenRejectModal(shop)}
                            disabled={isCurrentActionLoading}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-black transition disabled:opacity-50 cursor-pointer"
                          >
                            <XCircle size={14} />
                            Reject
                          </button>
                        </>
                      )}

                      {isApproved && (
                        <button
                          onClick={() => handleSuspend(shop)}
                          disabled={isCurrentActionLoading}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-slate-700 dark:text-gray-200 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                        >
                          <AlertTriangle size={14} />
                          Suspend
                        </button>
                      )}

                      {(isRejected || isSuspended) && (
                        <button
                          onClick={() => handleReactivate(shop)}
                          disabled={isCurrentActionLoading}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 hover:bg-emerald-100 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                        >
                          <CheckCircle2 size={14} />
                          Re-approve
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Verification & Metadata Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {/* Submitted Store Address */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-gray-900/70 border border-slate-200/70 dark:border-gray-800 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                        <span className="flex items-center gap-1"><MapPin size={12} /> Submitted Store Location</span>
                        <a
                          href={`https://www.google.com/maps?q=${shop.latitude},${shop.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 hover:underline flex items-center gap-0.5"
                        >
                          Open Map <ExternalLink size={10} />
                        </a>
                      </div>
                      <p className="font-semibold text-slate-800 dark:text-gray-200">{shop.address}</p>
                      <p className="text-[11px] text-slate-500">
                        GPS: {shop.latitude.toFixed(5)}, {shop.longitude.toFixed(5)}
                      </p>
                    </div>

                    {/* OpenStreetMap Real Food Business Match */}
                    <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/50 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-400 font-bold uppercase tracking-wider text-[10px]">
                        <span className="flex items-center gap-1"><Building2 size={12} /> OSM Food Match Verification</span>
                        <span className="font-black text-emerald-700 dark:text-emerald-300">
                          {shop.location_verification_provider?.toUpperCase() || "NOMINATIM"}
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        Matched: {shop.location_verification_name || shop.name}
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-gray-300 line-clamp-1">
                        {shop.location_verification_address || shop.address}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold pt-0.5">
                        <span>Distance: {shop.location_verification_distance_meters != null ? `${shop.location_verification_distance_meters}m` : "Exact"}</span>
                        <span>•</span>
                        <span>Category: {shop.location_verification_category || "Food / Grocery"}</span>
                      </div>
                    </div>

                    {/* Storefront Photo & Verification Document Card */}
                    <div className="p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/50 space-y-2 text-xs md:col-span-2">
                      <div className="flex items-center justify-between text-purple-800 dark:text-purple-400 font-bold uppercase tracking-wider text-[10px]">
                        <span className="flex items-center gap-1"><FileText size={12} /> Vendor Store Photo & Business License</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {/* Storefront Photo */}
                        <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-purple-100 dark:border-gray-700">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">📸 Storefront Photo</p>
                          {shop.photo_url ? (
                            <div className="space-y-1">
                              <img src={getFullMediaUrl(shop.photo_url)} alt="Storefront" className="w-full h-24 object-cover rounded-lg border" />
                              <a href={getFullMediaUrl(shop.photo_url)} target="_blank" rel="noreferrer" className="text-[11px] text-purple-600 font-bold hover:underline flex items-center gap-1">
                                View Full Photo <ExternalLink size={10} />
                              </a>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic py-4 text-center">No storefront photo uploaded</p>
                          )}
                        </div>

                        {/* Business Document */}
                        <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-purple-100 dark:border-gray-700">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">📄 Business License / GST / FSSAI</p>
                          {(shop.document_url || shop.verification_document_url) ? (
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                📎 {shop.verification_document_name || "Business License Document"}
                              </p>
                              <a
                                href={getFullMediaUrl(shop.document_url || shop.verification_document_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 px-3 py-1.5 rounded-lg font-bold hover:bg-purple-200 transition"
                              >
                                Inspect Document <ExternalLink size={11} />
                              </a>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic py-4 text-center">No license document attached</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rejection / Moderation Reason note if any */}
                  {shop.approval_reason && (
                    <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs text-red-700 dark:text-red-300">
                      <strong>Moderation Note:</strong> {shop.approval_reason}
                    </div>
                  )}

                  {shop.approved_by && (
                    <div className="text-[11px] text-slate-400 dark:text-gray-500">
                      Approved by: {shop.approved_by} {shop.approved_at && `on ${new Date(shop.approved_at).toLocaleDateString()}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && selectedShopForReject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-slate-200 dark:border-gray-700 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center">
                <XCircle size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Reject Shop Application
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedShopForReject.name} ({selectedShopForReject.owner_email})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-gray-300">
              Please state the specific reason for rejecting this food business application. This will be sent directly to the merchant.
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1.5">
                  Rejection Reason (Mandatory)
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g., The business could not be verified as a food seller; coordinates point to an electronics shop."
                  className="w-full rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-slate-900 dark:text-white p-3.5 text-xs outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 font-medium"
                />
              </div>

              {rejectError && (
                <p className="text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-xl border border-red-200">
                  {rejectError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-gray-700 text-xs font-bold text-slate-600 dark:text-gray-300 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading !== null}
                  className="px-5 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-black transition shadow-md shadow-red-600/25 disabled:opacity-50 cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
