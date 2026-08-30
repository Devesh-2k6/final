# ExpiryGo 🚀

**Near-expiry grocery & food surplus rescue platform.** Fight food waste, empower local shops, and save money with dynamic AI pricing and live inventory dispatch.

---

## 🏛️ System Architecture

ExpiryGo is built with a decoupled, high-performance architecture:

```
                                  ┌─────────────────────────────┐
                                  │   FastAPI Backend Server    │
                                  │   (Python 3.11, Port 8000)  │
                                  └──────────────┬──────────────┘
                                                 │
                        ┌────────────────────────┴────────────────────────┐
                        ▼                                                 ▼
        ┌───────────────────────────────┐                 ┌───────────────────────────────┐
        │   React / Next.js Web App     │                 │   React Native (Expo) App     │
        │   (Next.js 15, Port 3000)     │                 │   (Expo SDK 54 Mobile Client) │
        │   - Responsive Desktop & PWA  │                 │   - iOS & Android Native App  │
        │   - Live Map & Deals Feed     │                 │   - Native Camera & Barcode   │
        │   - Shopkeeper Analytics      │                 │   - 1-Tap PIN Verification    │
        │   - Zero-Waste Recipe Basket  │                 │   - Local Surplus Radar       │
        └───────────────────────────────┘                 └───────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Web Frontend** | React 19, Next.js 15 (App Router), Tailwind CSS, Lucide React, Framer Motion, Leaflet Maps, SWR |
| **Mobile App** | React Native, Expo SDK 54, React Navigation 7, TypeScript, Camera & Barcode Scanner |
| **Backend API** | Python FastAPI, Pydantic v2, SQLAlchemy, JWT Auth (bcrypt), GZip compression, WebSockets |
| **Database & Cache** | SQLite (Local Dev) / PostgreSQL (Supabase Production), In-Memory / Redis Caching |
| **AI & ML Engine** | Scikit-Learn Logistic Regression (Rescue Probability & Demand Velocity), Dynamic Markdown Engine |

---

## ⚡ Quick Start (1-Click Run)

### Option 1: Automatic Launcher (Windows)
Double-click `start-local.bat` or run:
```cmd
start-local.bat
```
*This automatically seeds the database, launches the FastAPI backend at port 8000, and boots the Next.js web application at port 3000.*

---

### Option 2: Manual Terminal Startup

**Terminal 1 — Backend API**
```bash
cd backend
python seed_data.py
python -m uvicorn main:app --reload --port 8000
```
- API Docs (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Endpoint: [http://localhost:8000/health](http://localhost:8000/health)

**Terminal 2 — React Web App**
```bash
npm install
npm run dev
```
- Open [http://localhost:3000](http://localhost:3000) in your browser.

**Terminal 3 — React Native Mobile App**
```bash
npm run mobile
```
- Press `w` for Web preview, `a` for Android emulator, `i` for iOS simulator, or scan the QR code with **Expo Go** on your phone.

---

## 🔑 Pre-Seeded Demo Accounts

The database comes pre-populated with active shops, categories, and discounted products:

| Role | Email | Password | Access & Dashboard |
|---|---|---|---|
| **Customer** | `customer@test.com` | `password123` | Deals Feed, Store Pickups, Delivery Checkout, Recipe Chef |
| **Shopkeeper 1** | `shop1@test.com` | `password123` | *Green Valley Supermarket* — Add Products, Analytics, Verify PINs |
| **Shopkeeper 2** | `shop2@test.com` | `password123` | *Fresh Mart Express* — Manage Inventory & Orders |
| **Shopkeeper 3** | `shop3@test.com` | `password123` | *Daily Bazaar* — Bakery & Produce Surplus |

---

## 📱 Feature Highlights

### 🛒 Customer Features
1. **Live Surplus Deals Feed**: Real-time deals with automated countdown discounts (up to 70-85% off near expiry).
2. **Interactive Map & Proximity Radar**: Live store locator with distance-based navigation and store hours.
3. **Smart Checkout**: Select between **Store Pickup** (generates a secure 6-digit pickup PIN) or **Home Delivery**.
4. **Zero-Waste Recipe Generator**: Convert surplus basket ingredients into recipes before expiry.
5. **Impact Tracker**: Measure personal money saved, food rescued (kg), and CO₂ emissions prevented.

### 🏪 Shopkeeper Features
1. **AI Spoilage Risk Dashboard**: Predicts rescue likelihood using logistic regression and demand velocity.
2. **Smart Product Management**: Real-time automatic discount tiering based on days/hours left until expiration.
3. **Pickup PIN Verifier**: Instant 6-digit PIN validation at the retail counter.
4. **Order Status Lifecycle**: Full transition workflow (`PENDING` → `ACCEPTED` → `OUT_FOR_DELIVERY` → `DELIVERED`).

---

## 🧪 Automated Testing & Verification

The project includes a 100% passing test suite:

```bash
# Run backend comprehensive automated flow tests (13 core flows)
python backend/test_flow_complete.py

# Run unit tests
cd backend && python -m pytest tests/test_api.py -v

# Verify Next.js frontend build
npm run build
```

---

## 📁 Project Directory Structure

```
expirygo/
├── backend/                  # FastAPI Python backend
│   ├── db/                   # Database models & SQLAlchemy sessions
│   ├── routers/              # API endpoints (auth, products, shops, orders, etc.)
│   ├── services/             # ML forecast, OCR scan, email notification
│   ├── tests/                # Pytest unit & integration test suites
│   ├── main.py               # Application entrypoint & middleware
│   ├── schemas.py            # Pydantic validation schemas
│   └── seed_data.py          # Demo database seeder
├── mobile/                   # Native React Native (Expo) application
│   ├── src/
│   │   ├── api/              # Unified fetch client with auth token interceptor
│   │   ├── navigation/       # React Navigation bottom tabs & stack navigators
│   │   ├── screens/          # Customer, Shopkeeper, Admin, & Auth screens
│   │   └── theme/            # Design tokens & color system
│   └── App.tsx               # Expo root component
├── src/                      # React / Next.js 15 Web Application
│   ├── app/                  # App Router pages (deals, map, profile, shop, checkout)
│   ├── components/           # Reusable UI cards, modal dialogs, map components
│   └── contexts/             # Client state (AuthContext, CartContext, WebSocket)
├── start-local.bat           # 1-Click launcher for local review & demo
└── package.json              # Web app scripts and dependencies
```
