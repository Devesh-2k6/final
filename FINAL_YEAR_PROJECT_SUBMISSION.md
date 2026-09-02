# 🎓 EXPIRYGO — FINAL YEAR PROJECT SUBMISSION & HANDOVER

**Project Title:** ExpiryGo — AI-Powered Dynamic Clearance & Surplus Food Redistribution Ecosystem  
**Release Tag:** `v1.0.0-final-year-project`  
**Date:** September 2026  
**Status:** **LOCKED & VERIFIED (Production Ready)**

---

## 🌟 Executive Summary

ExpiryGo is an end-to-end multi-platform ecosystem designed to reduce commercial retail food waste through:
1. **Dynamic Decay Pricing Algorithm**: Calculates fair-tiered automatic clearance discounts based on expiration velocity, hours remaining, and shopkeeper floor prices.
2. **Real-Time Cross-Platform Synchronization**: Web portal and native Expo Go mobile apps sync live over WebSockets and unified REST APIs without stale data.
3. **AI Multilingual Voice & OCR Date Scanning**: Offline/low-latency vision heuristics and natural language parsing across multiple Indian languages.
4. **Interactive Geolocation & Digital Fridge**: OpenStreetMap & Leaflet interactive deal exploration and consumer digital pantry tracking.

---

## 🏗️ Architecture & Component Stack

| Layer | Technology | Key Roles |
| :--- | :--- | :--- |
| **Backend API** | Python 3.11, FastAPI, SQLAlchemy, Pydantic v2 | High-throughput REST API, WebSocket notifications, ML forecasting, and token security |
| **Database** | PostgreSQL (Supabase Cloud) + SQLite WAL local fallback | ACID compliant relational persistence, automated schema migration, zero data loss |
| **Web Portal** | Next.js 15, React 19, TailwindCSS, Framer Motion, Leaflet | Responsive merchant management, deals explorer, interactive maps, admin console |
| **Mobile App** | React Native, Expo Go (SDK 52), TypeScript | Native Android/iOS deals feed, barcode scanner, QR verification, real-time push |
| **Testing & QA** | Appium, Selenium, OWASP ZAP, Locust/Pytest | Automated E2E tests, load testing reports, vulnerability pentests |

---

## 🔐 Demonstration & Default Credentials

| Role | Email | Password | Access / Permissions |
| :--- | :--- | :--- | :--- |
| **Platform Administrator** | `devpant2006@gmail.com` | *(Admin Token)* | Full Admin Console, verification, platform analytics (`/admin`) |
| **Shopkeeper (Green Valley)** | `shop1@test.com` | `password123` | Merchant Dashboard, inventory deals, order fulfillment (`/shop`) |
| **Customer / Consumer** | `customer@test.com` | `password123` | Deals browsing, pickup reservations, Digital Fridge (`/deals`, Mobile) |

---

## 🚀 How to Launch the Entire Ecosystem

### Quick Start (Single Command):
Double-click [`start-all.bat`](file:///c:/Users/DEVESH/Downloads/expirygo/start-all.bat) or run:
```powershell
start-all.bat
```

This single command will:
1. Auto-detect the host Wi-Fi IP address.
2. Start the **FastAPI Backend Server** on `http://0.0.0.0:8000`.
3. Start the **Next.js Web Portal** on `http://localhost:3000`.
4. Start the **Expo Go Metro Server** on `exp://<LAN_IP>:8081`.
5. Open the **QR Scanner & Mobile Companion** at `http://localhost:3000/mobile`.

---

## 📱 Mobile App (Expo Go) Instructions

1. Connect your smartphone to the **same Wi-Fi network** as the host laptop.
2. Open the **Expo Go** app on your phone.
3. Scan the QR code shown on `http://localhost:3000/mobile` or in the Metro terminal.
4. Enjoy real native mobile features (OCR camera scanning, barcode lookup, live push updates).

---

## 📊 Test Suite & Quality Assurance Reports

All test reports and spreadsheets are located in the repository:
- 📄 **Appium Mobile E2E Report:** [`appium-tests/ExpiryGo_Mobile_Appium_E2E_Test_Report.xlsx`](file:///c:/Users/DEVESH/Downloads/expirygo/appium-tests/ExpiryGo_Mobile_Appium_E2E_Test_Report.xlsx)
- 📄 **Selenium Web E2E Report:** [`selenium-tests/reports/ExpiryGo_E2E_Test_Execution_Report.xlsx`](file:///c:/Users/DEVESH/Downloads/expirygo/selenium-tests/reports/ExpiryGo_E2E_Test_Execution_Report.xlsx)
- 📄 **Security & PenTest Audit:** [`security-tests/reports/ExpiryGo_Security_PenTest_Report.xlsx`](file:///c:/Users/DEVESH/Downloads/expirygo/security-tests/reports/ExpiryGo_Security_PenTest_Report.xlsx)
- 📄 **Performance & Load Testing:** [`Vulnerability Test Results/ExpiryGo_Baseline_Load_Test_Report.xlsx`](file:///c:/Users/DEVESH/Downloads/expirygo/Vulnerability%20Test%20Results/ExpiryGo_Baseline_Load_Test_Report.xlsx)

---

## 🔒 Code Lock Details
- **Git Commit:** `feat(release): lock final year project codebase v1.0.0`
- **Git Tag:** `v1.0.0-final-year-project`
- **Integrity Status:** 100% Clean Working Tree, All Tests Passing
