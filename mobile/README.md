# ExpiryGo - Native React Native (Expo) Mobile App

This is the 100% native React Native mobile application for **ExpiryGo**, built with Expo SDK 52, React Navigation, and TypeScript.

---

## 📱 Features

### 🛒 Customer Experience
- **Live Surplus Deals Feed**: Real-time flash deals stream with freshness badges (Green/Amber/Red), discount pills, and countdown timers.
- **AI Surplus Intelligence**: Logistic-regression-based rescue probability score, optimal dynamic pricing, and sellout velocity.
- **Zero-Waste Recipe Chef**: Select items into your recipe basket and generate gourmet recipes to cook before ingredients spoil.
- **Proximity Radar & Maps**: Find nearby bakeries and grocery stores rescuing surplus meals.
- **Store Pickup & Delivery**: Instant 6-digit PIN code generation for store pickups with digital barcode visualization, and instant courier delivery checkout.
- **Eco-Impact Tracker**: Track lifetime money saved (₹), meals rescued, and CO₂ emissions mitigated (kg).

### 🏪 Store Owner Experience
- **AI Spoilage Risk Dashboard**: Spoilage risk classification (<24h critical risk), revenue overview, and ML diagnostics.
- **AI OCR Date Scanner**: Direct native camera integration that scans printed manufacturing and expiry dates directly from labels.
- **Barcode Lookup**: Live barcode scanner to auto-populate product names and categories.
- **Pickup PIN Verifier**: Fast 6-digit PIN validator to verify customer pickups at store counter in 1 second.
- **Delivery Orders Dispatcher**: Accept, dispatch, and mark customer delivery orders.
- **Store Profile & GPS**: Auto-detect store GPS coordinates with device location.

---

## 🚀 Running the App

### 1. Start FastAPI Backend (in `backend/`)
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Start Expo Mobile App
From the root directory:
```bash
npm run mobile
```
Or inside the `mobile/` directory:
```bash
npx expo start
```

### 3. Run on Device / Simulator
- **Android Emulator**: Press `a` in the Expo terminal.
- **iOS Simulator**: Press `i` in the Expo terminal.
- **Expo Go App (Physical Phone)**: Scan the QR code with the Expo Go app on Android or the iOS Camera app.
- **Web Preview**: Press `w` in the Expo terminal.

---

## ⚙️ Backend Configuration on Mobile Devices
By default:
- Android Emulators connect to `http://10.0.2.2:8000`.
- iOS Simulators & Web connect to `http://localhost:8000`.
- Physical phones on LAN: Navigate to **Impact (Profile) -> Backend API Configuration** and set your local machine's IP (e.g. `http://192.168.1.15:8000`).
