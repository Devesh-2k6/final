"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShoppingBag, ArrowRight, Clock, MapPin, CheckCircle2, ShieldAlert } from "lucide-react";

import { ShopperLayout } from "@/components/layout/ShopperLayout";
import { useAuth } from "@/contexts/AuthenticationContext";
import { getMyReservations } from "@/services/reservations";
import type { ApiReservation } from "@/types/product";
import { getSafeImageUrl } from "@/lib/images";

export default function CartPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [reservations, setReservations] = useState<ApiReservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    getMyReservations()
      .then((data) => {
        // Active/pending items
        const pending = data.filter((r) => r.status === "PENDING");
        setReservations(pending);
      })
      .catch(() => setReservations([]))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  const totalAmount = reservations.reduce((sum, r) => sum + (r.total_price || (r.product?.discount_price ? r.product.discount_price * r.quantity : 0)), 0);

  return (
    <ShopperLayout>
      <div className="min-h-screen bg-[#FAFAFE] dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                <ShoppingBag className="text-emerald-500" size={30} />
                Your Bag & Active Holds
              </h1>
              <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                Items held for pickup or ready to checkout
              </p>
            </div>
            <Link
              href="/reservations"
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              All Orders &rarr;
            </Link>
          </div>

          {!user && !authLoading ? (
            <div className="p-8 text-center bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 space-y-4">
              <ShieldAlert size={48} className="text-amber-500 mx-auto" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sign in to view your bag</h3>
              <p className="text-sm text-slate-500 dark:text-gray-400 max-w-sm mx-auto">
                Items you hold or reserve will appear here once you log in.
              </p>
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-600/20"
              >
                Sign In Now
              </Link>
            </div>
          ) : loading ? (
            <div className="p-12 text-center text-slate-400 font-bold">Loading bag...</div>
          ) : reservations.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center mx-auto">
                <ShoppingBag size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Your bag is empty</h3>
              <p className="text-sm text-slate-500 dark:text-gray-400 max-w-sm mx-auto">
                Discover nearby surplus deals at up to 70% off before they sell out!
              </p>
              <Link
                href="/deals"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-lg shadow-emerald-600/20"
              >
                Explore Live Deals <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {reservations.map((res) => (
                <motion.div
                  key={res.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-slate-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-gray-800 overflow-hidden relative shrink-0">
                      <Image
                        src={getSafeImageUrl(res.product?.front_image_url)}
                        alt={res.product?.name || "Product"}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {res.product?.name || "Reserved Item"}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin size={12} className="text-orange-500" />
                        {(res.product as any)?.shop?.name || (res as any).shop?.name || "Local Shop"}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold">
                          Qty: {res.quantity}
                        </span>
                        <span className="font-black text-slate-900 dark:text-white">
                          ₹{(res.total_price || ((res.product?.discount_price || 0) * res.quantity)).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Link
                      href={`/checkout?rid=${res.id}`}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition"
                    >
                      Pay & Confirm
                    </Link>
                    <Link
                      href="/reservations"
                      className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-slate-600 dark:text-gray-300 font-bold text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      Pickup Code
                    </Link>
                  </div>
                </motion.div>
              ))}

              {/* Total & Checkout Bar */}
              <div className="bg-emerald-600 text-white rounded-3xl p-6 shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-emerald-100">Total Active Value</p>
                  <p className="text-2xl font-black">₹{totalAmount.toFixed(0)}</p>
                </div>
                <Link
                  href={reservations.length > 0 ? `/checkout?rid=${reservations[0].id}` : "/deals"}
                  className="px-6 py-3 rounded-2xl bg-white text-emerald-700 hover:bg-emerald-50 font-black text-sm transition shadow-md flex items-center gap-2"
                >
                  Proceed to Checkout <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </ShopperLayout>
  );
}
