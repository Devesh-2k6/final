"use client";

import { useState, useEffect } from "react";
import { Store, MapPin, CheckCircle2, Loader2, Navigation, Save, QrCode, Truck, AlertCircle, ShieldCheck } from "lucide-react";
import { getMyShop, updateShop } from "@/services/shops";
import Map from "@/components/Map";

const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

export default function ShopSettingsPage() {
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Delivery & UPI Fields
  const [upiId, setUpiId] = useState("");
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [minOrderAmount, setMinOrderAmount] = useState("0");
  const [upiError, setUpiError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    getMyShop()
      .then((data) => {
        setShopId(data.id);
        setShopName(data.name || "");
        setAddress(data.address || "");
        setDescription(data.description || "");
        setLatitude(data.latitude ?? null);
        setLongitude(data.longitude ?? null);
        setUpiId(data.upi_id || "");
        setDeliveryEnabled(data.delivery_enabled ?? true);
        setDeliveryFee(data.delivery_fee ? String(data.delivery_fee) : "0");
        setMinOrderAmount(data.min_order_amount ? String(data.min_order_amount) : "0");
      })
      .catch(() => setLoadError("No shop found. Complete setup first."))
      .finally(() => setIsLoading(false));
  }, []);

  const handleGetLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setIsLocating(false);
        },
        () => {
          setIsLocating(false);
          alert("Could not get your location. Please grant location permissions.");
        }
      );
    } else {
      setIsLocating(false);
      alert("Geolocation is not supported by your browser.");
    }
  };

  const handleUpiChange = (val: string) => {
    const clean = val.trim();
    setUpiId(clean);
    if (clean && !UPI_REGEX.test(clean)) {
      setUpiError("Invalid UPI format. Must be format: username@bank (e.g. merchant@okhdfcbank)");
    } else {
      setUpiError(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId || !shopName || !address || latitude === null || longitude === null) {
      alert("Please fill out all required fields and set your location.");
      return;
    }

    if (upiId && !UPI_REGEX.test(upiId.trim())) {
      alert("Please enter a valid UPI ID (e.g. merchant@okhdfcbank).");
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await updateShop(shopId, {
        name: shopName,
        address,
        description,
        latitude,
        longitude,
        upi_id: upiId.trim() || null,
        delivery_enabled: deliveryEnabled,
        delivery_fee: parseFloat(deliveryFee) || 0.0,
        min_order_amount: parseFloat(minOrderAmount) || 0.0,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin text-emerald-500" />
      </div>
    );
  }

  if (loadError || !shopId) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <p>{loadError ?? "Shop not found."}</p>
        <a href="/shop/setup" className="mt-4 inline-block text-emerald-600 font-semibold">
          Set up your shop
        </a>
      </div>
    );
  }

  const npciTestUrl = upiId ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName || "Merchant")}&cu=INR` : "";

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto pb-24">
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight text-white">Shop Settings</h1>
        <p className="mt-1 text-sm text-gray-400 font-medium">
          Manage store profile, location, UPI payment handle, and delivery preferences.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Store Profile */}
        <div className="bg-[#1A1A1A] rounded-3xl border border-white/5 shadow-2xl p-6 sm:p-8 backdrop-blur-3xl bg-gradient-to-br from-[#1A1A1A] to-[#151515]">
          <h2 className="text-lg font-black tracking-tight text-white mb-6 flex items-center gap-2">
            <Store size={20} className="text-emerald-400" /> Store Profile
          </h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                Shop Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full bg-[#141414] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-[#141414] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-medium resize-none"
              />
            </div>
          </div>
        </div>

        {/* UPI Payments & Delivery Configuration */}
        <div className="bg-[#1A1A1A] rounded-3xl border border-white/5 shadow-2xl p-6 sm:p-8 backdrop-blur-3xl bg-gradient-to-br from-[#1A1A1A] to-[#151515]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              <QrCode size={20} className="text-emerald-400" /> UPI Payments & Delivery Settings
            </h2>
            <span className="text-xs font-bold text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
              <ShieldCheck size={14} /> UPI Direct Settlement
            </span>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-1">
                Merchant UPI ID / VPA <span className="text-red-400">*</span>
              </label>
              <p className="text-xs text-gray-400 mb-2.5">
                Required for receiving customer delivery payments directly to your bank account via UPI.
              </p>
              <input
                type="text"
                value={upiId}
                onChange={(e) => handleUpiChange(e.target.value)}
                placeholder="e.g. yourstore@okhdfcbank or merchant@upi"
                className={`w-full bg-[#141414] border ${upiError ? "border-red-500/70" : "border-white/5"} rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono font-medium`}
              />
              {upiError && (
                <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1 font-medium">
                  <AlertCircle size={14} /> {upiError}
                </p>
              )}
              {!upiId && (
                <div className="mt-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-start gap-2">
                  <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>
                    Without a valid UPI ID, delivery orders will be disabled for your store. In-store pickup reservations will remain active.
                  </span>
                </div>
              )}
            </div>

            {/* Delivery Toggle & Options */}
            <div className="pt-4 border-t border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-[#141414] border border-white/5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Truck size={16} className="text-emerald-400" /> Delivery Enabled
                    </span>
                    <input
                      type="checkbox"
                      checked={deliveryEnabled}
                      onChange={(e) => setDeliveryEnabled(e.target.checked)}
                      className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Accept delivery orders from nearby customers.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#141414] border border-white/5">
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Delivery Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-white/5 rounded-lg px-3 py-2 text-white font-mono text-sm outline-none focus:border-emerald-500/50"
                />
                <p className="text-[10px] text-gray-500 mt-1">Flat fee added to delivery orders</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#141414] border border-white/5">
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Min Order Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={minOrderAmount}
                  onChange={(e) => setMinOrderAmount(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-white/5 rounded-lg px-3 py-2 text-white font-mono text-sm outline-none focus:border-emerald-500/50"
                />
                <p className="text-[10px] text-gray-500 mt-1">Minimum subtotal to allow delivery</p>
              </div>
            </div>

            {/* Test QR Preview string */}
            {upiId && !upiError && (
              <div className="p-4 rounded-2xl bg-[#141414] border border-white/5 text-xs text-gray-400 space-y-1">
                <div className="text-gray-300 font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-400" /> Active NPCI URI Ready
                </div>
                <p className="font-mono text-[11px] text-gray-500 truncate">{npciTestUrl}</p>
              </div>
            )}
          </div>
        </div>

        {/* Location Settings */}
        <div className="bg-[#1A1A1A] rounded-3xl border border-white/5 shadow-2xl p-6 sm:p-8 backdrop-blur-3xl bg-gradient-to-br from-[#1A1A1A] to-[#151515]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              <MapPin size={20} className="text-emerald-400" /> Location Settings
            </h2>
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={isLocating}
              className="flex items-center justify-center gap-2 bg-blue-500/10 hover:bg-blue-500/25 text-blue-400 border border-blue-500/20 rounded-xl px-4 py-2 font-bold text-sm transition-all disabled:opacity-50"
            >
              {isLocating ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
              Update GPS Coordinates
            </button>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                Street Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-[#141414] border border-white/5 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-medium"
                required
              />
            </div>
            {latitude !== null && longitude !== null && (
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                  Map Preview
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-bold">
                    {latitude.toFixed(5)}, {longitude.toFixed(5)}
                  </span>
                </label>
                <div className="h-64 w-full rounded-2xl overflow-hidden border border-white/5 shadow-2xl relative">
                  <Map lat={latitude} lng={longitude} zoom={16} popupText={shopName || "Your Shop"} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 mt-8">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-bold animate-pulse">
              <CheckCircle2 size={18} />
              Changes saved successfully!
            </span>
          )}
          <button
            type="submit"
            disabled={isSaving || !!upiError}
            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-[#111111] rounded-xl px-8 py-3.5 font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/10 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
