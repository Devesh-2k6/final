"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getMyReservations } from "@/services/reservations";
import { getMyOrders, cancelOrder } from "@/services/orders";
import { getSafeImageUrl } from "@/lib/images";
import type { ApiReservation, ApiOrder } from "@/types/product";
import { Loader2, Package, MapPin, CheckCircle, Clock, ArrowLeft, CreditCard, Star, X, Truck, ShoppingBag, XCircle } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { leaveReview } from "@/services/shops";
import { motion, AnimatePresence } from "framer-motion";
import { getErrorMessage } from "@/api/errors";

export default function MyReservations() {
  const [reservations, setReservations] = useState<ApiReservation[]>([]);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Review Modal State
  const [activeShopForReview, setActiveShopForReview] = useState<string | null>(null);
  const [activeShopName, setActiveShopName] = useState<string>("");
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  const loadReservations = async () => {
    try {
      const [resData, orderData] = await Promise.all([
        getMyReservations(),
        getMyOrders(),
      ]);
      setReservations(resData);
      setOrders(orderData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setCancellingOrderId(orderId);
    try {
      await cancelOrder(orderId);
      alert("Order cancelled successfully.");
      await loadReservations();
    } catch (err) {
      alert("Failed to cancel order: " + getErrorMessage(err));
    } finally {
      setCancellingOrderId(null);
    }
  };

  const openReviewModal = (shopId: string, shopName: string) => {
    setActiveShopForReview(shopId);
    setActiveShopName(shopName);
    setRating(0);
    setComment("");
    setReviewError(null);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShopForReview) return;
    if (rating < 1 || rating > 5) {
      setReviewError("Please select a rating between 1 and 5 stars.");
      return;
    }

    setSubmittingReview(true);
    setReviewError(null);

    try {
      await leaveReview(activeShopForReview, rating, comment.trim() || undefined);
      alert("Thank you! Your review has been submitted successfully.");
      setActiveShopForReview(null);
    } catch (err) {
      setReviewError(getErrorMessage(err));
    } finally {
      setSubmittingReview(false);
    }
  };

  // Combine and sort both lists
  const allItems = [
    ...reservations.map(r => ({ ...r, itemType: "reservation" as const })),
    ...orders.map(o => ({ ...o, itemType: "order" as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Render status badge for orders
  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === "PENDING") {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <Clock size={10} /> Pending
        </span>
      );
    }
    if (s === "ACCEPTED") {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center gap-1">
          <CheckCircle size={10} /> Accepted
        </span>
      );
    }
    if (s === "OUT_FOR_DELIVERY") {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center gap-1">
          <Truck size={10} className="animate-pulse" /> Out for Delivery
        </span>
      );
    }
    if (s === "DELIVERED") {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <CheckCircle size={10} /> Delivered
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 flex items-center gap-1">
        <XCircle size={10} /> Cancelled
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 pt-4 pb-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/deals" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">My Orders & Reservations</h1>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto mt-4 space-y-4">
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>
        ) : allItems.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <Package size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="font-semibold">No orders yet.</p>
            <p className="text-sm mt-1 mb-4">Find nearby deals and order or reserve them today!</p>
            <Link href="/deals" className="bg-emerald-600 text-white font-bold px-6 py-2 rounded-xl">Find Deals</Link>
          </div>
        ) : (
          allItems.map(item => (
            <div key={item.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 relative overflow-hidden">
              {item.itemType === "order" && (
                <div className="absolute top-0 right-0">
                  <span className={`text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl text-white ${item.order_type === 'DELIVERY' ? 'bg-purple-600' : 'bg-blue-600'}`}>
                    {item.order_type}
                  </span>
                </div>
              )}

              <div className="flex gap-4 p-2">
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 relative border border-gray-100 dark:border-gray-700">
                  <Image src={getSafeImageUrl(item.product.front_image_url)} alt={item.product.name} fill sizes="64px" className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-950 dark:text-white text-sm truncate">{item.product.name}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-gray-500 font-medium">
                    <span className="flex items-center gap-1"><MapPin size={11}/> {item.product.shop?.name}</span>
                    <span className="flex items-center gap-1"><Clock size={11}/> {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  
                  <div className="flex justify-between items-end mt-3">
                    <span className="font-bold text-emerald-600 text-sm">
                      ₹{item.total_price.toFixed(2)}
                      {item.itemType === "order" && item.delivery_fee > 0 && (
                        <span className="text-[10px] text-gray-400 font-normal ml-1">(+ ₹{item.delivery_fee.toFixed(0)} delivery)</span>
                      )}
                      <span className="text-xs text-gray-400 font-normal ml-1.5">(x{item.quantity})</span>
                    </span>

                    <div className="flex gap-2 items-center">
                      {item.itemType === "reservation" ? (
                        <>
                          {item.payment_status === "PAID" && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">PAID</span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${item.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                            {item.status === 'COMPLETED' ? <CheckCircle size={10}/> : <Clock size={10}/>} {item.status}
                          </span>
                        </>
                      ) : (
                        getStatusBadge(item.status)
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Reservation pickup instructions */}
              {item.itemType === "reservation" && item.status === 'PENDING' && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Show this code to the shopkeeper</p>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl py-2 px-6 inline-block border">
                    <span className="text-2xl font-mono font-black tracking-widest text-gray-900 dark:text-white">{item.pickup_code}</span>
                  </div>
                  {item.payment_status === "UNPAID" && (
                    <div className="mt-3">
                      <Link href={`/checkout/${item.id}`} className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold shadow-sm">
                        <CreditCard size={14} /> Pay Online Now
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Order details */}
              {item.itemType === "order" && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 space-y-2 bg-gray-50/50 dark:bg-gray-800/20 p-3 rounded-xl">
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700/50 pb-1.5 mb-1.5">
                    <span className="flex items-center gap-1">
                      {item.order_type === "DELIVERY" ? <Truck size={12} className="text-purple-500" /> : <ShoppingBag size={12} className="text-blue-500" />}
                      {item.order_type} ORDER DETAILS
                    </span>
                    <span>{new Date(item.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="space-y-1">
                    <p><strong>Customer Name:</strong> {item.customer_name || 'N/A'}</p>
                    {item.customer_phone && <p><strong>Customer Phone:</strong> {item.customer_phone}</p>}
                    {item.order_type === "DELIVERY" ? (
                      <p><strong>Delivery Address:</strong> {item.delivery_address || 'N/A'}</p>
                    ) : (
                      <>
                        <p><strong>Pickup Location:</strong> {item.product.shop?.name}</p>
                        <p><strong>Pickup Address:</strong> {item.product.shop?.address || 'N/A'}</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Order cancellation trigger */}
              {item.itemType === "order" && item.status === "PENDING" && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <button 
                    onClick={() => handleCancelOrder(item.id)}
                    disabled={cancellingOrderId !== null}
                    className="w-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition disabled:opacity-50"
                  >
                    {cancellingOrderId === item.id ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <XCircle size={14} /> Cancel Order
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Leave Review Triggers */}
              {((item.itemType === "reservation" && item.status === 'COMPLETED') ||
                (item.itemType === "order" && item.status === 'DELIVERED')) && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <button 
                    onClick={() => openReviewModal(item.shop_id, item.product.shop?.name || "the shop")} 
                    className="w-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition"
                  >
                    <Star size={14} /> Leave a Review
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </main>

      <BottomNav />

      {/* Review Modal */}
      <AnimatePresence>
        {activeShopForReview && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4"
              onClick={() => setActiveShopForReview(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25 }}
                className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800 z-[1000] relative"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={() => setActiveShopForReview(null)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                >
                  <X size={20} />
                </button>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Rate Your Experience</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">How was your deal pickup from <span className="font-semibold text-emerald-600">{activeShopName}</span>?</p>

                <form onSubmit={handleReviewSubmit} className="space-y-6">
                  {/* Star Rating Selector */}
                  <div className="flex justify-center items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="text-amber-400 focus:outline-none transition-transform duration-150 active:scale-90"
                      >
                        <Star
                          size={40}
                          className={`${
                            star <= (hoveredRating || rating)
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-300 dark:text-gray-700"
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  {/* Comment box */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                      Review Comments (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Share your experience (e.g., friendly staff, fresh food)..."
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition resize-none"
                    />
                  </div>

                  {reviewError && (
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-3">
                      {reviewError}
                    </p>
                  )}

                  {/* Submit buttons */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveShopForReview(null)}
                      className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3.5 rounded-xl text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl text-sm transition flex items-center justify-center gap-2 disabled:opacity-75"
                    >
                      {submittingReview ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Review"
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
