"use client";

import { useEffect, useState } from "react";
import { getShopReservations, verifyReservation } from "@/services/reservations";
import { getShopOrders, updateOrderStatus } from "@/services/orders";
import type { ApiReservation, ApiOrder, OrderStatus } from "@/types/product";
import { Loader2, CheckCircle, Package, Clock, ShieldCheck, XCircle, Truck, ShoppingBag } from "lucide-react";
import { getErrorMessage } from "@/api/errors";

export default function ShopReservations() {
  const [reservations, setReservations] = useState<ApiReservation[]>([]);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tab State: "reservations" or "orders"
  const [activeTab, setActiveTab] = useState<"reservations" | "orders">("orders");

  // Verify Reservation State
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [pickupCodes, setPickupCodes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Updating Order State
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [resData, orderData] = await Promise.all([
        getShopReservations(),
        getShopOrders(),
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
    loadData();
  }, []);

  const handleVerify = async (resId: string) => {
    setError(null);
    setSuccess(null);
    const code = pickupCodes[resId];
    if (!code || code.trim().length !== 6) {
      setError("Please enter a valid 6-character pickup code.");
      return;
    }
    setVerifyingId(resId);
    try {
      await verifyReservation(resId, code.trim());
      setSuccess("Reservation successfully verified! Food handed over.");
      setPickupCodes((prev) => {
        const copy = { ...prev };
        delete copy[resId];
        return copy;
      });
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setVerifyingId(null);
    }
  };

  const handleOrderStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    setError(null);
    setSuccess(null);
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      setSuccess(`Order status updated to ${newStatus} successfully.`);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>;
  }

  // Group Reservation states
  const pendingReservations = reservations.filter(r => r.status === "PENDING");
  const completedReservations = reservations.filter(r => r.status === "COMPLETED");

  // Group Order states
  const pendingOrders = orders.filter(o => o.status === "PENDING");
  const activeOrders = orders.filter(o => ["ACCEPTED", "OUT_FOR_DELIVERY"].includes(o.status));
  const pastOrders = orders.filter(o => ["DELIVERED", "CANCELLED"].includes(o.status));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="text-emerald-500" /> Shop Orders & Pickups
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your incoming food rescue deals and verify customer orders.</p>
        </div>

        {/* Tab switcher */}
        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex gap-1 border border-gray-200/50 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "orders"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Manage Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("reservations")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "reservations"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Verify Pickups ({pendingReservations.length})
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-semibold mb-4 border border-red-100 dark:border-red-900/30 flex items-center gap-2"><XCircle size={18}/>{error}</div>}
      {success && <div className="bg-emerald-50 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl text-sm font-semibold mb-4 border border-emerald-100 dark:border-emerald-900/20 flex items-center gap-2"><CheckCircle size={18}/>{success}</div>}

      {/* reservations Tab */}
      {activeTab === "reservations" && (
        <div className="space-y-6">
          <h2 className="text-lg font-black text-gray-800 dark:text-gray-200 border-b pb-2 flex items-center gap-2">
            <Clock size={18} className="text-amber-500" />
            Ready for Pickup ({pendingReservations.length})
          </h2>
          {pendingReservations.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 italic text-sm">No pending reservations.</p>
          ) : (
            <div className="grid gap-4">
              {pendingReservations.map(res => (
                <div key={res.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex gap-4 items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={res.product.front_image_url} alt={res.product.name} className="w-16 h-16 rounded-xl object-cover bg-gray-100 border border-gray-200/50" />
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm">{res.product.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-semibold">Qty: {res.quantity} | Total: <span className="font-bold text-emerald-600">₹{res.total_price.toFixed(2)}</span></p>
                      <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-1"><Clock size={10}/> Reserved {new Date(res.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex w-full sm:w-auto items-center gap-2">
                    <input 
                      type="text" 
                      placeholder="Enter 6-digit code" 
                      maxLength={6}
                      value={pickupCodes[res.id] || ""}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setPickupCodes((prev) => ({ ...prev, [res.id]: val }));
                      }}
                      className="w-full sm:w-40 uppercase bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-center font-mono font-bold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                    />
                    <button 
                      onClick={() => handleVerify(res.id)}
                      disabled={verifyingId !== null || !(pickupCodes[res.id]?.length === 6)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2 disabled:opacity-50"
                    >
                      {verifyingId === res.id ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                      Verify
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h2 className="text-lg font-black text-gray-800 dark:text-gray-200 border-b pb-2 mt-8">Completed Today ({completedReservations.length})</h2>
          <div className="grid gap-3">
            {completedReservations.slice(0, 5).map(res => (
              <div key={res.id} className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 flex justify-between items-center opacity-70 border border-gray-100 dark:border-gray-800">
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-xs">{res.product.name} (x{res.quantity})</h3>
                  <p className="text-[10px] text-gray-500">Completed at {new Date(res.created_at).toLocaleTimeString()}</p>
                </div>
                <CheckCircle className="text-emerald-500" size={20} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* orders Tab */}
      {activeTab === "orders" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* Section 1: Pending Order Requests */}
          <div className="space-y-4">
            <h2 className="text-base font-black text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2 flex items-center justify-between">
              <span>Pending Requests ({pendingOrders.length})</span>
            </h2>
            {pendingOrders.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">No incoming pending order requests.</p>
            ) : (
              <div className="grid gap-4">
                {pendingOrders.map(order => (
                  <div key={order.id} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-150 dark:border-gray-700 p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex gap-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={order.product.front_image_url} alt="" className="w-14 h-14 rounded-2xl object-cover bg-gray-50 border border-gray-200/50" />
                        <div>
                          <h3 className="font-black text-gray-900 dark:text-white text-sm">{order.product.name}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">Qty: {order.quantity} | Value: <strong className="text-emerald-600">₹{order.total_price.toFixed(2)}</strong></p>
                          <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-2 text-white ${order.order_type === 'DELIVERY' ? 'bg-purple-600' : 'bg-blue-600'}`}>
                            {order.order_type === 'DELIVERY' ? <Truck size={10} /> : <ShoppingBag size={10} />}
                            {order.order_type}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOrderStatusUpdate(order.id, "ACCEPTED")}
                          disabled={updatingOrderId !== null}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleOrderStatusUpdate(order.id, "CANCELLED")}
                          disabled={updatingOrderId !== null}
                          className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-bold px-4 py-2 rounded-xl text-xs transition disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <div className="flex justify-between font-bold text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 border-b border-gray-150 dark:border-gray-700/50 pb-1">
                        <span>Customer & Order Details</span>
                        <span>Ordered on {new Date(order.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p><strong>Customer:</strong> {order.customer_name || 'N/A'} {order.customer_phone ? `(${order.customer_phone})` : ''}</p>
                      {order.order_type === "DELIVERY" ? (
                        <p><strong>Delivery Address:</strong> {order.delivery_address || 'N/A'}</p>
                      ) : (
                        <p><strong>Type:</strong> Self Pickup at Shop</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Active Orders / Deliveries */}
          <div className="space-y-4">
            <h2 className="text-base font-black text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">
              Active Orders & Shipments ({activeOrders.length})
            </h2>
            {activeOrders.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">No active orders or shipments.</p>
            ) : (
              <div className="grid gap-4">
                {activeOrders.map(order => (
                  <div key={order.id} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex gap-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={order.product.front_image_url} alt="" className="w-14 h-14 rounded-2xl object-cover bg-gray-50 border" />
                        <div>
                          <h3 className="font-bold text-gray-900 dark:text-white text-sm">{order.product.name}</h3>
                          <div className="flex gap-2 items-center mt-1">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${order.status === 'OUT_FOR_DELIVERY' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {order.status}
                            </span>
                            <span className="text-[10px] text-gray-400">Qty: {order.quantity} | ₹{order.total_price.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Transition actions */}
                      <div>
                        {order.order_type === "DELIVERY" ? (
                          order.status === "ACCEPTED" ? (
                            <button
                              onClick={() => handleOrderStatusUpdate(order.id, "OUT_FOR_DELIVERY")}
                              disabled={updatingOrderId !== null}
                              className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-2 rounded-xl text-xs shadow-sm transition"
                            >
                              Dispatch Order
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOrderStatusUpdate(order.id, "DELIVERED")}
                              disabled={updatingOrderId !== null}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-xs shadow-sm transition"
                            >
                              Mark Delivered
                            </button>
                          )
                        ) : (
                          /* Pickup order accepted status */
                          <button
                            onClick={() => handleOrderStatusUpdate(order.id, "DELIVERED")}
                            disabled={updatingOrderId !== null}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-xs shadow-sm transition"
                          >
                            Mark Collected
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <div className="flex justify-between font-bold text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 border-b border-gray-150 dark:border-gray-700/50 pb-1">
                        <span>Customer & Order Details</span>
                        <span>Ordered on {new Date(order.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p><strong>Customer:</strong> {order.customer_name || 'N/A'} {order.customer_phone ? `(${order.customer_phone})` : ''}</p>
                      {order.order_type === "DELIVERY" ? (
                        <p><strong>Delivery Address:</strong> {order.delivery_address || 'N/A'}</p>
                      ) : (
                        <p><strong>Type:</strong> Self Pickup at Shop</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Past Orders history */}
          <div className="space-y-4">
            <h2 className="text-base font-black text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">
              Past Orders ({pastOrders.length})
            </h2>
            {pastOrders.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 italic">No past orders in history.</p>
            ) : (
              <div className="grid gap-3">
                {pastOrders.slice(0, 10).map(order => (
                  <div key={order.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-5 shadow-sm space-y-4 opacity-90">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex gap-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={order.product.front_image_url} alt="" className="w-12 h-12 rounded-2xl object-cover bg-gray-50 border" />
                        <div>
                          <h3 className="font-bold text-gray-800 dark:text-gray-200 text-xs truncate">{order.product.name}</h3>
                          <div className="flex gap-2 items-center mt-1">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${order.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                              {order.status}
                            </span>
                            <span className="text-[10px] text-gray-400">Qty: {order.quantity} | ₹{order.total_price.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-white ${order.order_type === 'DELIVERY' ? 'bg-purple-600' : 'bg-blue-600'}`}>
                        {order.order_type === 'DELIVERY' ? <Truck size={10} /> : <ShoppingBag size={10} />}
                        {order.order_type}
                      </span>
                    </div>

                    <div className="p-3 bg-gray-50/50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <div className="flex justify-between font-bold text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 border-b border-gray-150 dark:border-gray-700/50 pb-1">
                        <span>Customer & Order Details</span>
                        <span>Ordered on {new Date(order.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p><strong>Customer:</strong> {order.customer_name || 'N/A'} {order.customer_phone ? `(${order.customer_phone})` : ''}</p>
                      {order.order_type === "DELIVERY" ? (
                        <p><strong>Delivery Address:</strong> {order.delivery_address || 'N/A'}</p>
                      ) : (
                        <p><strong>Type:</strong> Self Pickup at Shop</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
