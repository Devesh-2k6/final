"use client";

import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, ShoppingBag, Leaf, DollarSign, Star, Users, RefreshCw, Loader2, Package } from "lucide-react";
import { getShopAnalytics } from "@/services/shops";
import { getMyOrders } from "@/services/orders";
import type { ApiAnalytics, ApiOrder } from "@/types/product";
import { motion } from "framer-motion";

function StatCard({ label, value, sub, color, icon: Icon }: { label: string; value: string | number; sub?: string; color: string; icon: React.FC<any> }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-5 shadow-sm flex flex-col gap-2 border-l-4 ${color}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</span>
        <Icon size={20} className="text-slate-300 dark:text-slate-600" />
      </div>
      <p className="text-3xl font-black text-slate-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </motion.div>
  );
}

export default function ShopAnalyticsPage() {
  const [analytics, setAnalytics] = useState<ApiAnalytics | null>(null);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [a, o] = await Promise.all([getShopAnalytics(), getMyOrders()]);
      setAnalytics(a);
      setOrders(o);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Order status breakdown
  const ordersByStatus = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const totalRevenue = orders.filter((o) => o.status === "DELIVERED").reduce((sum, o) => sum + o.total_price, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="text-emerald-500" size={26} />
            Shop Analytics
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track revenue, rescues, and order performance.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-sm font-bold hover:bg-emerald-100 transition disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-emerald-500" size={36} />
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Items Rescued" value={analytics?.total_items_saved ?? 0} sub="Since store launch" color="border-emerald-400" icon={Leaf} />
            <StatCard label="Total Revenue" value={`₹${totalRevenue.toFixed(0)}`} sub="Delivered orders" color="border-blue-400" icon={DollarSign} />
            <StatCard label="Avg. Rating" value={analytics?.average_rating ? analytics.average_rating.toFixed(1) : "N/A"} sub="From customer reviews" color="border-amber-400" icon={Star} />
            <StatCard label="Total Orders" value={orders.length} sub="All time" color="border-purple-400" icon={ShoppingBag} />
          </div>

          {/* Order Status Breakdown */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Package size={18} className="text-purple-500" />Order Status Breakdown
            </h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(ordersByStatus).map(([status, count]) => {
                const colorMap: Record<string, string> = {
                  DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
                  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
                  ACCEPTED: "bg-blue-50 text-blue-700 border-blue-200",
                  CANCELLED: "bg-red-50 text-red-700 border-red-200",
                  OUT_FOR_DELIVERY: "bg-purple-50 text-purple-700 border-purple-200",
                };
                const cls = colorMap[status] ?? "bg-gray-50 text-gray-700 border-gray-200";
                return (
                  <div key={status} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold ${cls}`}>
                    <span>{count}</span>
                    <span className="font-semibold opacity-80">{status.replace(/_/g, " ")}</span>
                  </div>
                );
              })}
              {Object.keys(ordersByStatus).length === 0 && (
                <p className="text-sm text-slate-400">No orders yet.</p>
              )}
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b dark:border-gray-700 flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-500" />
              <h2 className="text-base font-black text-slate-800 dark:text-white">Recent Orders</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/40 text-xs uppercase text-gray-400 font-bold tracking-wider">
                    <th className="px-5 py-3 text-left">Order ID</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-left">Type</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {orders.slice(0, 15).map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <td className="px-5 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{o.id.slice(0, 12)}…</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${o.status === "DELIVERED" ? "bg-emerald-100 text-emerald-700" : o.status === "CANCELLED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{o.status}</span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400">{o.order_type ?? "PICKUP"}</td>
                      <td className="px-5 py-3 text-right font-bold text-slate-900 dark:text-white">₹{o.total_price.toFixed(2)}</td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr><td colSpan={4} className="py-10 text-center text-sm text-slate-400">No orders found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
