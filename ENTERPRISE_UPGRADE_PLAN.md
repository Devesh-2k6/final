# ExpiryGo 🚀 — Enterprise Quick-Commerce Upgrade Plan
**Production-Grade Architecture & Implementation Blueprint**
*(Matching Swiggy Instamart, Zepto, Blinkit & Too Good To Go)*

---

## 📌 Executive Summary
This document provides the complete, step-by-step implementation blueprint to elevate **ExpiryGo** from a proof-of-concept into an enterprise-grade, real-time quick-commerce and surplus rescue platform. 

It introduces 6 real-world modules:
1. **Real-Time Delivery Rider GPS Tracker** (Live map with moving rider icon, ETA countdown, and Delivery Handover PIN).
2. **Instant Scan-to-Pay UPI QR & Payment Sandbox** (Dynamic UPI intent QR + Card 3D Secure simulation + COD).
3. **Dark Store Picker POS Terminal** (Camera barcode verification for store staff to ensure FEFO packing).
4. **"Magic Surplus Mystery Bags" Engine** (Too Good To Go / Instamart style high-discount surprise drops).
5. **Hyperlocal Geofencing & 15-Minute Delivery Serviceability Engine** (Real-time GPS radius checking & distance fee).
6. **Automated GST-Compliant Tax Invoice Generator** (Itemized PDF / printable receipt with CO2e and money savings metrics).

---

## 🏛️ System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CUSTOMER INTERFACES                                         │
│   ┌───────────────────────────┐    ┌───────────────────────────┐    ┌────────────────────────┐ │
│   │   Magic Surplus Drops     │    │  Hyperlocal Geofencing    │    │  Live Rider Tracker    │ │
│   │   (Surprise Bags ₹89)     │    │  (15-min ETA & Distance)  │    │  (Moving Map + PIN)    │ │
│   └─────────────┬─────────────┘    └─────────────┬─────────────┘    └────────────┬───────────┘ │
└─────────────────┼────────────────────────────────┼───────────────────────────────┼─────────────┘
                  │                                │                               │
                  ▼                                ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     FASTAPI BACKEND CORE                                        │
│   ┌───────────────────────────┐    ┌───────────────────────────┐    ┌────────────────────────┐ │
│   │ /orders/{id}/tracking     │    │ /payments/upi-qr          │    │ /orders/{id}/verify-pos│ │
│   │ (Live coordinates & ETA)  │    │ (Dynamic UPI payload)     │    │ (Barcode verification) │ │
│   └─────────────┬─────────────┘    └─────────────┬─────────────┘    └────────────┬───────────┘ │
└─────────────────┼────────────────────────────────┼───────────────────────────────┼─────────────┘
                  │                                │                               │
                  ▼                                ▼                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               DATABASE & REAL-TIME DISPATCH                                     │
│   - Orders Table (delivery_pin, rider_name, rider_lat, rider_lng, estimated_delivery_time)      │
│   - Products Table (is_surprise_bag, surprise_bag_items_preview, original_mrp, rescue_price)   │
│   - WebSockets Dispatch Hub (/ws/orders/{id})                                                   │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Module-by-Module Technical Specification

### Module 1: Real-Time Delivery Rider GPS Tracker
* **Customer Route:** `/track?orderId={id}` or integrated inside `/reservations`.
* **Database Fields Added (`Order` Model):**
  * `delivery_pin`: 4-digit numeric string (e.g. `"4829"`) generated automatically on order creation.
  * `rider_name`: String (e.g. `"Rahul Sharma"`).
  * `rider_phone`: String (e.g. `"+91 98765 43210"`).
  * `rider_vehicle`: String (e.g. `"TVS Apache RTR - KA 01 EQ 9120"`).
  * `rider_rating`: Float (e.g. `4.9`).
  * `rider_lat`: Float (Current simulated GPS latitude).
  * `rider_lng`: Float (Current simulated GPS longitude).
  * `estimated_minutes`: Integer (Dynamic countdown, e.g. `14`).
* **Frontend Component:** `src/components/orders/LiveRiderTracker.tsx`
  * Render Leaflet map with custom motorcycle marker moving along the polyline route from Store Lat/Lng to Customer Lat/Lng.
  * Live status stepper: `Order Confirmed` ➔ `Dark Store Packed` ➔ `Rider Picked Up` ➔ `Out for Delivery` ➔ `Delivered`.
  * Display secure 4-digit Delivery Handover PIN.

---

### Module 2: Instant Scan-to-Pay UPI QR & Payment Sandbox
* **Customer Flow:** Triggered from Checkout (`/checkout`) or Deals Quick-Buy.
* **UPI Intent Payload:** 
  * `upi://pay?pa=expirygo.rescue@icici&pn=ExpiryGo%20Surplus&am={amount}&cu=INR&tn=Order_{orderId}`
* **Frontend Component:** `src/components/checkout/PaymentModal.tsx` & `src/components/checkout/UpiQrModal.tsx`
  * **Tab 1: UPI Scan & Pay:** Displays high-contrast QR code, 5:00 countdown timer, 1-tap open in PhonePe / GPay / Paytm.
  * **Tab 2: Card / NetBanking Sandbox:** Card number with Luhn verification, auto-format (`XXXX XXXX XXXX XXXX`), CVV, and 3D Secure OTP simulation.
  * **Tab 3: Cash on Delivery (COD) / Pay on Handover.**
  * Simulated instant payment confirmation webhook that updates order status to `PAID` + confetti celebration.

---

### Module 3: Dark Store Picker POS Mode (Barcode Verification)
* **Shopkeeper Route:** `/shop` (Dedicated "Picker Terminal" Tab).
* **Workflow:**
  1. Store staff sees incoming pending order.
  2. Clicks **"Pick & Pack Order"**.
  3. Launches native camera scanner: `src/components/shop/DarkStorePickerModal.tsx`.
  4. Scans physical barcode on product package.
  5. System validates:
     * Barcode matches product SKU.
     * Expiry date is within the advertised batch window.
  6. On successful scan: Plays confirmation audio chime, updates status to `ACCEPTED` and `PACKED`, auto-assigns delivery rider.

---

### Module 4: "Magic Surplus Mystery Bags" Engine
* **Customer Route:** Highlighted section on `/deals` and `/` homepage.
* **Business Concept:** Too Good To Go / Instamart Surplus Drops model where grocery shops bundle near-expiry goods into high-value surprise crates at 70–80% off.
* **Example Pre-configured Bags:**
  * 🥐 *Midnight Bakery Mystery Box* (MRP ₹400 ➔ Rescue Price ₹89)
  * 🥛 *Fresh Dairy & Fruit Rescue Crate* (MRP ₹500 ➔ Rescue Price ₹129)
  * 🥫 *Gourmet Pantry Surprise Bag* (MRP ₹600 ➔ Rescue Price ₹149)
* **Frontend Component:** `src/components/products/MagicSurplusBags.tsx`
  * Live remaining bags counter (`"Only 2 left today"`).
  * Guaranteed items preview list & dietary tags (100% Veg, Halal, etc.).
  * 1-Click Instant Reserve.

---

### Module 5: Hyperlocal Geofencing & 15-Minute Delivery Engine
* **Location Service:** Browser HTML5 Geolocation API + Fallback Pincode Geocoding.
* **Haversine Distance Engine:**
  * Distance calculated between customer lat/lng and shop lat/lng.
* **Serviceability Rules:**
  * **<= 3 km:** `"⚡ 12-15 Mins Superfast Delivery Available"` (Fee: ₹19).
  * **3 - 6 km:** `"🛵 20-30 Mins Standard Delivery Available"` (Fee: ₹35).
  * **> 6 km:** `"📍 Store Pickup Only (Beyond Express Radius)"`.
* **Frontend Component:** `src/components/navigation/HyperlocalLocationHeader.tsx`

---

### Module 6: Automated GST-Compliant Tax Invoice (PDF & Print Engine)
* **Customer Route:** Available in `/reservations` and post-checkout screen.
* **Invoice Specifications:**
  * Invoice ID: `INV-2026-EX-{random-5-digits}`
  * Registered Entity Details: Shop Name, Address, GSTIN, FSSAI License Number.
  * Line items with Original MRP, Dynamic Rescue Discount, Taxable Value, CGST (2.5%), SGST (2.5%), Delivery Charge, and Total Amount Paid.
  * **Sustainability Impact Badge:** Real quantified metric (*"You prevented 1.4 kg of CO2e and saved ₹290 on this purchase!"*).
  * Digital QR code for delivery receipt authentication.
  * Direct browser print / PDF export capability with clean print CSS styling.

---

## 🛠️ Step-by-Step Execution Checklist (When Ready)

| Step | Component | Target Files | Estimated Time |
|---|---|---|---|
| **1** | Database & Models | `backend/db/models.py`, `backend/schemas.py` | 15 mins |
| **2** | Tracking & POS API Endpoints | `backend/routers/orders.py`, `backend/routers/products.py` | 20 mins |
| **3** | Seed Realistic Data & Mystery Bags | `backend/seed_data.py` | 10 mins |
| **4** | Dynamic UPI QR & Payment Modal | `src/components/checkout/PaymentModal.tsx`, `CheckoutClient.tsx` | 25 mins |
| **5** | Live Rider GPS Tracker & Leaflet Route | `src/app/track/page.tsx`, `src/components/orders/LiveRiderTracker.tsx` | 30 mins |
| **6** | Dark Store Picker POS Camera Scanner | `src/components/shop/DarkStorePickerModal.tsx`, `src/app/shop/page.tsx` | 25 mins |
| **7** | Magic Surplus Mystery Bags UI | `src/components/products/MagicSurplusBags.tsx`, `src/app/deals/page.tsx` | 20 mins |
| **8** | Hyperlocal Geofencing & Address Bar | `src/components/navigation/HyperlocalLocationHeader.tsx` | 15 mins |
| **9** | GST Tax Invoice Generator | `src/components/orders/TaxInvoiceModal.tsx`, `src/app/reservations/page.tsx` | 20 mins |
| **10** | End-to-End Build & Verification | Full frontend build & backend test suite | 15 mins |

---

## 🎓 Why This Secures an Outstanding Final-Year Grade (Viva Points)
1. **Real-world Business Parity:** Solves the actual $50B food waste problem faced by quick-commerce dark stores (FEFO inventory decay).
2. **Algorithmic Depth:** Dynamic markdown price decay + Haversine geofencing + TF-IDF semantic recommendation.
3. **Enterprise Completeness:** Includes the full lifecycle (Discovery ➔ Hyperlocal ETA ➔ UPI Payment ➔ Dark Store Picker Barcode Verification ➔ Live Rider GPS Map ➔ PIN Handover ➔ GST Tax Invoice).
