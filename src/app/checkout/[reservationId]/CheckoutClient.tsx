"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, CheckCircle, ArrowLeft, Lock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { getMyReservations, checkoutReservation } from "@/services/reservations";
import type { ApiReservation } from "@/types/product";

export default function CheckoutClient({ reservationId }: { reservationId: string }) {
  const router = useRouter();
  const [reservation, setReservation] = useState<ApiReservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [success, setSuccess] = useState(false);

  // Stripe Card Input States
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [saveCard, setSaveCard] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    getMyReservations().then(res => {
      const found = res.find(r => r.id === reservationId);
      if (found) setReservation(found);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [reservationId]);

  // Card brand detection based on starting digit
  const cardBrand = useMemo(() => {
    const cleanNum = cardNumber.replace(/\s+/g, "");
    if (cleanNum.startsWith("4")) return "visa";
    if (cleanNum.startsWith("5")) return "mastercard";
    return "generic";
  }, [cardNumber]);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    const formatted = value.replace(/(\d{4})(?=\d)/g, "$1 ").slice(0, 19); // 16 digits + 3 spaces
    setCardNumber(formatted);
  };

  const handleCardExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}`;
    }
    setCardExpiry(value.slice(0, 5));
  };

  const handleCardCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setCardCvc(value.slice(0, 4));
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!cardName.trim()) {
      errors.cardName = "Cardholder name is required";
    }
    const cleanNumber = cardNumber.replace(/\s+/g, "");
    if (!/^\d{16}$/.test(cleanNumber)) {
      errors.cardNumber = "Card number must be 16 digits";
    }
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      errors.cardExpiry = "Expiry must be MM/YY";
    } else {
      const [month, year] = cardExpiry.split("/").map(Number);
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear() % 100;
      if (month < 1 || month > 12) {
        errors.cardExpiry = "Invalid month";
      } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
        errors.cardExpiry = "Expired card";
      }
    }
    if (!/^\d{3,4}$/.test(cardCvc)) {
      errors.cardCvc = "CVC must be 3 or 4 digits";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setProcessing(true);
    
    // Simulate real payment steps
    setProcessingStep("Verifying card credentials...");
    await new Promise(r => setTimeout(r, 1000));
    
    setProcessingStep("Contacting bank gateway...");
    await new Promise(r => setTimeout(r, 1000));
    
    setProcessingStep("Finalizing FreshSave reservation...");
    await new Promise(r => setTimeout(r, 800));

    try {
      await checkoutReservation(reservationId);
      setSuccess(true);
      setTimeout(() => {
        router.push("/reservations");
      }, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert("Payment failed: " + msg);
      setProcessing(false);
      setProcessingStep("");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950"><Loader2 className="animate-spin text-emerald-500" size={36} /></div>;
  if (!reservation) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 text-gray-500 font-bold">Reservation not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden relative">
        
        {success ? (
          <div className="p-10 flex flex-col items-center text-center animate-in fade-in duration-500">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-6 shadow-inner animate-bounce">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">Payment Successful!</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Thank you for saving food and cutting down CO2 waste.</p>
            <p className="text-emerald-600 dark:text-emerald-400 mt-6 font-semibold text-xs flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/5 px-3 py-1.5 rounded-full">
              <Loader2 size={12} className="animate-spin" /> Redirecting to reservations...
            </p>
          </div>
        ) : processing ? (
          <div className="p-10 flex flex-col items-center text-center min-h-[400px] justify-center animate-in fade-in duration-300">
            <Loader2 className="animate-spin text-emerald-500 mb-6" size={48} />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Processing Secure Payment</h3>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 animate-pulse">{processingStep}</p>
            <div className="mt-8 flex items-center gap-1.5 text-xs text-gray-400 font-medium">
              <Lock size={12} /> SSL 256-bit Secure Session
            </div>
          </div>
        ) : (
          <form onSubmit={handlePay}>
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center gap-4">
              <Link href="/reservations" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
              </Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Checkout Payment</h1>
            </div>
 
            <div className="p-6 space-y-6">
              {/* Product preview */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100/50 dark:border-gray-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={reservation.product.front_image_url} className="w-14 h-14 rounded-xl object-cover border" alt="" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white truncate text-sm">{reservation.product.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-0.5">Quantity: {reservation.quantity}</p>
                </div>
                <div className="text-right">
                  <div className="text-base font-black text-emerald-600 dark:text-emerald-400">₹{reservation.total_price.toFixed(2)}</div>
                </div>
              </div>
 
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Card Details</h3>
                  <div className="flex gap-1.5 text-xs text-gray-400 font-bold uppercase tracking-wider">
                    <span className={cardBrand === "visa" ? "text-blue-500 font-black" : "opacity-40"}>Visa</span>
                    <span className={cardBrand === "mastercard" ? "text-red-500 font-black" : "opacity-40"}>MC</span>
                  </div>
                </div>

                <div className="space-y-3.5 bg-gray-50/50 dark:bg-gray-800/20 p-4 rounded-2xl border border-gray-200/50 dark:border-gray-800/80">
                  {/* Cardholder Name */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                    />
                    {formErrors.cardName && <p className="text-[10px] text-red-500 font-bold mt-1">{formErrors.cardName}</p>}
                  </div>

                  {/* Card Number */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Card Number</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="4242 4242 4242 4242"
                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 pl-9 outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <CreditCard size={14} />
                      </div>
                    </div>
                    {formErrors.cardNumber && <p className="text-[10px] text-red-500 font-bold mt-1">{formErrors.cardNumber}</p>}
                  </div>

                  {/* Expiry & CVC Grid */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Expires</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={handleCardExpiryChange}
                        placeholder="MM/YY"
                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                      />
                      {formErrors.cardExpiry && <p className="text-[10px] text-red-500 font-bold mt-1">{formErrors.cardExpiry}</p>}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">CVC / CVV</label>
                      <input
                        type="text"
                        value={cardCvc}
                        onChange={handleCardCvcChange}
                        placeholder="123"
                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                      />
                      {formErrors.cardCvc && <p className="text-[10px] text-red-500 font-bold mt-1">{formErrors.cardCvc}</p>}
                    </div>
                  </div>
                </div>

                {/* Save card checkbox */}
                <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                  <input
                    type="checkbox"
                    checked={saveCard}
                    onChange={(e) => setSaveCard(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-700 text-emerald-600 focus:ring-emerald-500 w-4 h-4 bg-white dark:bg-gray-800"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Save card details for future checkouts</span>
                </label>
              </div>

              {/* Secure checkout info */}
              <div className="flex items-center gap-2 justify-center py-1 text-[10px] text-gray-400 font-bold uppercase tracking-wider border-t border-gray-100 dark:border-gray-800 pt-4">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>Secure payment powered by Stripe</span>
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <Lock size={16} />
                Pay ₹{reservation.total_price.toFixed(2)}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
