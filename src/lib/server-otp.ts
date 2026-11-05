import nodemailer from "nodemailer";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { put } from "@vercel/blob";

export type OtpRecord = {
  code: string;
  expires_at: number;
  name?: string;
  is_vendor?: boolean;
  role?: string;
  intent?: string;
  hashed_password?: string;
  password?: string;
  phone_number?: string;
  category?: string;
  upi_id?: string;
  photo_url?: string;
  document_url?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
};

export type StoredUser = {
  id: string;
  email: string;
  name: string;
  role: "CUSTOMER" | "VENDOR" | "ADMIN";
  is_shop_owner: boolean;
  email_verified: boolean;
  phone_number?: string;
  password_hash?: string;
  created_at: string;
};

export type StoredShop = {
  id: string;
  owner_id: string;
  name: string;
  category?: string;
  owner_name?: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
  phone_number?: string;
  address: string;
  latitude: number;
  longitude: number;
  upi_id?: string | null;
  photo_url?: string | null;
  document_url?: string | null;
  verification_document_url?: string | null;
  verification_document_name?: string | null;
  approval_status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  approval_reason?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  rejected_at?: string | null;
  is_active: boolean;
  location_verified: boolean;
  location_verified_at?: string | null;
  created_at?: string;
};

export interface StoreData {
  otps: Record<string, OtpRecord>;
  users: Record<string, StoredUser>;
  shops: Record<string, StoredShop>;
  products: any[];
  reservations?: any[];
  orders?: any[];
  pantry?: any[];
  scanner_events?: any[];
}

const BLOB_STORE_FILENAME = "expirygo_db_v1.json";
const BLOB_PUBLIC_URL = "https://ntkd7vsavwreywtx.public.blob.vercel-storage.com/expirygo_db_v1.json";
const BLOB_TOKEN =
  process.env.BLOB_READ_WRITE_TOKEN ||
  "vercel_blob_rw_ntKd7vsAVWrEywtx_ibzEnUJNAegcuyfZhRLRYBHJ4jPyfb";

const STORAGE_FILE = path.join(
  process.env.TEMP || process.env.TMP || "/tmp",
  "expirygo_serverless_store.json"
);

// Built-in baseline verified accounts (Admin only - zero pre-created vendors or customers)
const BASELINE_USERS: Record<string, StoredUser> = {
  "devpant2006@gmail.com": {
    id: "admin_devesh_001",
    email: "devpant2006@gmail.com",
    name: "Devesh Admin",
    role: "ADMIN",
    is_shop_owner: false,
    email_verified: true,
    created_at: "2026-11-01T00:00:00.000Z",
  },
};

const BASELINE_SHOPS: Record<string, StoredShop> = {};

function ensureBaseline(store: StoreData): void {
  for (const [email, user] of Object.entries(BASELINE_USERS)) {
    if (!store.users[email]) {
      store.users[email] = { ...user };
    }
  }
  for (const [id, shop] of Object.entries(BASELINE_SHOPS)) {
    if (!store.shops[id]) {
      store.shops[id] = { ...shop };
    }
  }
  if (!Array.isArray(store.products)) {
    store.products = [];
  }
  if (!Array.isArray(store.reservations)) {
    store.reservations = [];
  }
  if (!Array.isArray(store.orders)) {
    store.orders = [];
  }
  if (!Array.isArray(store.pantry)) {
    store.pantry = [];
  }
  if (!Array.isArray(store.scanner_events)) {
    store.scanner_events = [];
  }
}

function loadLocalStore(): StoreData {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        const store: StoreData = {
          otps: parsed.otps || {},
          users: parsed.users || {},
          shops: parsed.shops || {},
          products: Array.isArray(parsed.products) ? parsed.products : [],
          reservations: Array.isArray(parsed.reservations) ? parsed.reservations : [],
          orders: Array.isArray(parsed.orders) ? parsed.orders : [],
          pantry: Array.isArray(parsed.pantry) ? parsed.pantry : [],
          scanner_events: Array.isArray(parsed.scanner_events) ? parsed.scanner_events : [],
        };
        ensureBaseline(store);
        return store;
      }
    }
  } catch (err) {
    console.warn("[STORE] Failed to read local store file:", err);
  }
  const fresh: StoreData = { otps: {}, users: {}, shops: {}, products: [], reservations: [], orders: [], pantry: [] };
  ensureBaseline(fresh);
  return fresh;
}

// Global in-memory cache shared across calls in the same Node.js worker
const globalStore: StoreData = (global as any).__EXPIRYGO_DATA_STORE || loadLocalStore();
(global as any).__EXPIRYGO_DATA_STORE = globalStore;

let lastCloudSync = 0;
const CLOUD_SYNC_INTERVAL_MS = 2000; // re-sync from Vercel Blob at most every 2s

export async function ensureStoreLoaded(): Promise<StoreData> {
  const now = Date.now();
  if (now - lastCloudSync < CLOUD_SYNC_INTERVAL_MS && Object.keys(globalStore.users).length > 0) {
    return globalStore;
  }

  try {
    const res = await fetch(`${BLOB_PUBLIC_URL}?t=${now}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (res.ok) {
      const cloudData = await res.json();
      if (cloudData && typeof cloudData === "object") {
        // Merge cloud data into globalStore
        globalStore.otps = { ...cloudData.otps, ...globalStore.otps };
        globalStore.users = { ...cloudData.users, ...globalStore.users };
        globalStore.shops = { ...cloudData.shops, ...globalStore.shops };
        if (Array.isArray(cloudData.products)) {
          globalStore.products = cloudData.products;
        }
        if (Array.isArray(cloudData.reservations)) {
          globalStore.reservations = cloudData.reservations;
        }
        if (Array.isArray(cloudData.orders)) {
          globalStore.orders = cloudData.orders;
        }
        if (Array.isArray(cloudData.pantry)) {
          globalStore.pantry = cloudData.pantry;
        }
        ensureBaseline(globalStore);
        lastCloudSync = now;

        // Cache locally to /tmp
        try {
          fs.writeFileSync(STORAGE_FILE, JSON.stringify(globalStore, null, 2), "utf-8");
        } catch {}

        return globalStore;
      }
    }
  } catch (err) {
    console.warn("[STORE] Cloud fetch from Vercel Blob failed, falling back to local store:", err);
  }

  ensureBaseline(globalStore);
  return globalStore;
}

export async function saveStoreAsync(data: StoreData): Promise<void> {
  ensureBaseline(data);

  // 1. Write to local /tmp cache immediately
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("[STORE] Local write error:", err);
  }

  // 2. Commit to persistent Vercel Blob
  try {
    await put(BLOB_STORE_FILENAME, JSON.stringify(data, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      token: BLOB_TOKEN,
    });
    lastCloudSync = Date.now();
  } catch (err: any) {
    console.error("[STORE] Failed to persist store to Vercel Blob:", err.message);
  }
}

export function saveStore(data: StoreData): void {
  ensureBaseline(data);
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch {}
  // Fire and forget cloud write
  void saveStoreAsync(data);
}

export function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999));
}

export async function saveOtpAsync(
  email: string,
  code: string,
  extra?: Partial<OtpRecord>
): Promise<void> {
  const clean = email.trim().toLowerCase();
  globalStore.otps[clean] = {
    code: code.trim(),
    expires_at: Date.now() + 15 * 60 * 1000, // 15 minutes
    name: extra?.name,
    is_vendor: extra?.is_vendor,
    hashed_password: extra?.hashed_password || extra?.password,
    password: extra?.password || extra?.hashed_password,
    phone_number: extra?.phone_number,
    category: extra?.category,
    upi_id: extra?.upi_id,
    photo_url: extra?.photo_url,
    document_url: extra?.document_url,
    address: extra?.address,
    latitude: extra?.latitude,
    longitude: extra?.longitude,
  };
  await saveStoreAsync(globalStore);
}

export function saveOtp(email: string, code: string, extra?: Partial<OtpRecord>): void {
  void saveOtpAsync(email, code, extra);
}

export function getOtpRecord(email: string): OtpRecord | undefined {
  const clean = email.trim().toLowerCase();
  return globalStore.otps[clean];
}

export function deleteOtp(email: string): void {
  const clean = email.trim().toLowerCase();
  delete globalStore.otps[clean];
  saveStore(globalStore);
}

export async function verifyOtpCodeAsync(
  email: string,
  code: string
): Promise<{ valid: boolean; record?: OtpRecord }> {
  await ensureStoreLoaded();
  const clean = email.trim().toLowerCase();
  const cleanCode = code.trim();

  const record = globalStore.otps[clean];
  if (!record) {
    return { valid: false };
  }

  if (Date.now() > record.expires_at) {
    delete globalStore.otps[clean];
    await saveStoreAsync(globalStore);
    return { valid: false };
  }

  // Exact OTP match
  if (record.code === cleanCode) {
    delete globalStore.otps[clean];
    await saveStoreAsync(globalStore);
    return { valid: true, record };
  }

  return { valid: false };
}

export function verifyOtpCode(email: string, code: string): { valid: boolean; record?: OtpRecord } {
  const clean = email.trim().toLowerCase();
  const cleanCode = code.trim();
  const record = globalStore.otps[clean];
  if (!record) return { valid: false };
  if (Date.now() > record.expires_at) {
    delete globalStore.otps[clean];
    saveStore(globalStore);
    return { valid: false };
  }
  if (record.code === cleanCode) {
    delete globalStore.otps[clean];
    saveStore(globalStore);
    return { valid: true, record };
  }
  return { valid: false };
}

export async function saveUserAsync(user: StoredUser): Promise<void> {
  const clean = user.email.trim().toLowerCase();
  globalStore.users[clean] = user;
  await saveStoreAsync(globalStore);
}

export function saveUser(user: StoredUser): void {
  const clean = user.email.trim().toLowerCase();
  globalStore.users[clean] = user;
  saveStore(globalStore);
}

export async function getUserAsync(email: string): Promise<StoredUser | undefined> {
  await ensureStoreLoaded();
  const clean = email.trim().toLowerCase();
  if (globalStore.users[clean]) {
    return globalStore.users[clean];
  }
  if (BASELINE_USERS[clean]) {
    return BASELINE_USERS[clean];
  }
  return undefined;
}

export function getUser(email: string): StoredUser | undefined {
  const clean = email.trim().toLowerCase();
  return globalStore.users[clean] || BASELINE_USERS[clean];
}

export async function getUserByIdAsync(id: string): Promise<StoredUser | undefined> {
  await ensureStoreLoaded();
  return (
    Object.values(globalStore.users).find((u) => u.id === id) ||
    Object.values(BASELINE_USERS).find((u) => u.id === id)
  );
}

export function getUserById(id: string): StoredUser | undefined {
  return (
    Object.values(globalStore.users).find((u) => u.id === id) ||
    Object.values(BASELINE_USERS).find((u) => u.id === id)
  );
}

export async function getAllUsersAsync(): Promise<StoredUser[]> {
  await ensureStoreLoaded();
  return Object.values(globalStore.users);
}

export function getAllUsers(): StoredUser[] {
  return Object.values(globalStore.users);
}

export async function saveShopAsync(shop: StoredShop): Promise<void> {
  globalStore.shops[shop.id] = shop;
  await saveStoreAsync(globalStore);
}

export function saveShop(shop: StoredShop): void {
  globalStore.shops[shop.id] = shop;
  saveStore(globalStore);
}

export async function getShopByIdAsync(id: string): Promise<StoredShop | undefined> {
  await ensureStoreLoaded();
  return (
    globalStore.shops[id] ||
    Object.values(globalStore.shops).find((s) => s.id === id || s.owner_id === id) ||
    BASELINE_SHOPS[id]
  );
}

export function getShopById(id: string): StoredShop | undefined {
  return (
    globalStore.shops[id] ||
    Object.values(globalStore.shops).find((s) => s.id === id || s.owner_id === id) ||
    BASELINE_SHOPS[id]
  );
}

export async function getShopByOwnerIdAsync(ownerId: string): Promise<StoredShop | undefined> {
  await ensureStoreLoaded();
  return (
    Object.values(globalStore.shops).find((s) => s.owner_id === ownerId) ||
    Object.values(BASELINE_SHOPS).find((s) => s.owner_id === ownerId)
  );
}

export function getShopByOwnerId(ownerId: string): StoredShop | undefined {
  return (
    Object.values(globalStore.shops).find((s) => s.owner_id === ownerId) ||
    Object.values(BASELINE_SHOPS).find((s) => s.owner_id === ownerId)
  );
}

export async function getAllShopsAsync(): Promise<StoredShop[]> {
  await ensureStoreLoaded();
  return Object.values(globalStore.shops);
}

export function getAllShops(): StoredShop[] {
  return Object.values(globalStore.shops);
}

export async function deleteShopAsync(id: string): Promise<void> {
  delete globalStore.shops[id];
  await saveStoreAsync(globalStore);
}

export function deleteShop(id: string): void {
  delete globalStore.shops[id];
  saveStore(globalStore);
}

export async function getAllProductsAsync(): Promise<any[]> {
  await ensureStoreLoaded();
  return globalStore.products || [];
}

export function getAllProducts(): any[] {
  return globalStore.products || [];
}

export async function addProductAsync(prod: any): Promise<void> {
  if (!globalStore.products) globalStore.products = [];
  globalStore.products.unshift(prod);
  await saveStoreAsync(globalStore);
}

export function addProduct(prod: any): void {
  if (!globalStore.products) globalStore.products = [];
  globalStore.products.unshift(prod);
  saveStore(globalStore);
}

export async function deleteProductAsync(id: string): Promise<void> {
  if (!globalStore.products) return;
  globalStore.products = globalStore.products.filter((p) => p.id !== id);
  await saveStoreAsync(globalStore);
}

export function deleteProduct(id: string): void {
  if (!globalStore.products) return;
  globalStore.products = globalStore.products.filter((p) => p.id !== id);
  saveStore(globalStore);
}

export async function getAllReservationsAsync(): Promise<any[]> {
  await ensureStoreLoaded();
  return globalStore.reservations || [];
}

export async function getReservationByIdAsync(id: string): Promise<any | undefined> {
  await ensureStoreLoaded();
  return (globalStore.reservations || []).find((r) => r.id === id);
}

export async function addReservationAsync(reservation: any): Promise<void> {
  if (!globalStore.reservations) globalStore.reservations = [];
  globalStore.reservations.unshift(reservation);
  await saveStoreAsync(globalStore);
}

export async function updateReservationAsync(id: string, updates: any): Promise<any | null> {
  await ensureStoreLoaded();
  if (!globalStore.reservations) globalStore.reservations = [];
  const idx = globalStore.reservations.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  globalStore.reservations[idx] = { ...globalStore.reservations[idx], ...updates };
  await saveStoreAsync(globalStore);
  return globalStore.reservations[idx];
}

export async function getAllOrdersAsync(): Promise<any[]> {
  await ensureStoreLoaded();
  return globalStore.orders || [];
}

export async function getOrderByIdAsync(id: string): Promise<any | undefined> {
  await ensureStoreLoaded();
  return (globalStore.orders || []).find((o) => o.id === id);
}

export async function addOrderAsync(order: any): Promise<void> {
  if (!globalStore.orders) globalStore.orders = [];
  globalStore.orders.unshift(order);
  await saveStoreAsync(globalStore);
}

export async function updateOrderAsync(id: string, updates: any): Promise<any | null> {
  await ensureStoreLoaded();
  if (!globalStore.orders) globalStore.orders = [];
  const idx = globalStore.orders.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  globalStore.orders[idx] = { ...globalStore.orders[idx], ...updates };
  await saveStoreAsync(globalStore);
  return globalStore.orders[idx];
}

export function computePantryItemStats(raw: any): any {
  const now = Date.now();
  const exp = raw.expiry_date ? new Date(raw.expiry_date).getTime() : now + 86400000 * 3;
  const diffMs = exp - now;
  const totalSeconds = diffMs / 1000;
  const hoursLeft = Math.max(0, Math.round((totalSeconds / 3600) * 10) / 10);
  const daysLeft = Math.floor(hoursLeft / 24);

  let urgency: "FRESH" | "EXPIRING_SOON" | "CRITICAL" | "EXPIRED" = "FRESH";
  if (totalSeconds <= 0) {
    urgency = "EXPIRED";
  } else if (hoursLeft <= 24) {
    urgency = "CRITICAL";
  } else if (hoursLeft <= 72) {
    urgency = "EXPIRING_SOON";
  }

  return {
    ...raw,
    days_left: daysLeft,
    hours_left: hoursLeft,
    urgency_status: urgency,
  };
}

export async function getAllPantryItemsAsync(userId?: string): Promise<any[]> {
  await ensureStoreLoaded();
  let items = globalStore.pantry || [];
  if (userId) {
    items = items.filter((p) => p.user_id === userId);
  }
  return items.map(computePantryItemStats);
}

export async function addPantryItemAsync(item: any): Promise<any> {
  await ensureStoreLoaded();
  if (!globalStore.pantry) globalStore.pantry = [];
  const processed = computePantryItemStats(item);
  globalStore.pantry.unshift(processed);
  await saveStoreAsync(globalStore);
  return processed;
}

export async function updatePantryItemAsync(id: string, updates: any): Promise<any | null> {
  await ensureStoreLoaded();
  if (!globalStore.pantry) globalStore.pantry = [];
  const idx = globalStore.pantry.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  globalStore.pantry[idx] = computePantryItemStats({ ...globalStore.pantry[idx], ...updates });
  await saveStoreAsync(globalStore);
  return globalStore.pantry[idx];
}

export async function deletePantryItemAsync(id: string): Promise<boolean> {
  await ensureStoreLoaded();
  if (!globalStore.pantry) globalStore.pantry = [];
  const initialLen = globalStore.pantry.length;
  globalStore.pantry = globalStore.pantry.filter((p) => p.id !== id);
  if (globalStore.pantry.length !== initialLen) {
    await saveStoreAsync(globalStore);
    return true;
  }
  return false;
}

export function createToken(userId: string, role: string = "CUSTOMER"): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    })
  ).toString("base64url");
  const secret = process.env.JWT_SECRET_KEY || "expirygo_jwt_secret_key_production";
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

export function verifyToken(token: string): { sub: string; role: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const secret = process.env.JWT_SECRET_KEY || "expirygo_jwt_secret_key_production";
    const expectedSig = crypto.createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
    if (signature !== expectedSig) return null;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    if (decoded.exp && Date.now() / 1000 > decoded.exp) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function sendSmtpOtp(email: string, code: string, name?: string): Promise<boolean> {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER || process.env.SMTP_USERNAME || "devpant2006@gmail.com";
  const pass = process.env.SMTP_PASSWORD || "emetdeljxehsoyau";

  console.log(`[SMTP DISPATCH] Sending 6-digit OTP to ${email} via ${host}:${port}`);

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 24px; color: #0f172a;">
  <div style="max-width: 500px; margin: auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
    <div style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); padding: 28px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 800;">🌱 ExpiryGo</h1>
      <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Secure Account Verification</p>
    </div>
    <div style="padding: 28px;">
      <p style="font-size: 15px; font-weight: 600; margin-top: 0;">Hello ${name || "Valued User"},</p>
      <p style="font-size: 14px; color: #475569; line-height: 1.5;">Use the following 6-digit verification code to complete your registration or login:</p>
      <div style="background: #faf5ff; border: 2px dashed #d8b4fe; border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0;">
        <span style="font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #7c3aed;">${code}</span>
      </div>
      <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0;">This code is valid for 15 minutes and is single-use only. Never share this code with anyone.</p>
    </div>
    <div style="background: #f1f5f9; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
      &copy; ExpiryGo Surplus Marketplace. All rights reserved.
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `"ExpiryGo" <${user}>`,
      to: email,
      subject: `🔐 Your ExpiryGo Verification Code: ${code}`,
      text: `Your verification code is: ${code}. Valid for 15 minutes.`,
      html,
    });

    console.log(`[SMTP DISPATCH] Successfully sent email to ${email}`);
    return true;
  } catch (err: any) {
    console.error(`[SMTP ERROR] Could not deliver to ${email}:`, err.message);
    throw new Error(`Failed to deliver OTP email via SMTP: ${err.message}`);
  }
}


export async function getScannerEventsAsync(since: number = 0): Promise<any[]> {
  await ensureStoreLoaded();
  const events = globalStore.scanner_events || [];
  return events.filter((e) => e.timestamp > since);
}

export async function addScannerEventAsync(event: any): Promise<any> {
  await ensureStoreLoaded();
  if (!globalStore.scanner_events) globalStore.scanner_events = [];
  // Deduplicate recent same barcode if within 3 seconds
  const cutoff = Date.now() - 3000;
  const isDuplicate = globalStore.scanner_events.some(
    (e) => (e.barcode === event.barcode || e.code === event.code) && e.timestamp > cutoff
  );
  if (!isDuplicate) {
    globalStore.scanner_events.unshift(event);
    if (globalStore.scanner_events.length > 30) {
      globalStore.scanner_events = globalStore.scanner_events.slice(0, 30);
    }
    await saveStoreAsync(globalStore);
  }
  return event;
}

export async function clearScannerEventsAsync(): Promise<void> {
  await ensureStoreLoaded();
  globalStore.scanner_events = [];
  await saveStoreAsync(globalStore);
}

export async function verifyPickupCodeAsync(code: string): Promise<{
  success: boolean;
  type?: "reservation" | "order";
  item?: any;
  message: string;
}> {
  await ensureStoreLoaded();
  const clean = code.replace(/^EXPIRYGO:/i, "").trim().toUpperCase();
  if (!clean) return { success: false, message: "Pickup code is empty." };

  // 1. Check Reservations
  if (Array.isArray(globalStore.reservations)) {
    const resIdx = globalStore.reservations.findIndex(
      (r) => (r.pickup_code && r.pickup_code.toUpperCase() === clean) || r.id === clean
    );
    if (resIdx !== -1) {
      const reservation = globalStore.reservations[resIdx];
      const updated = {
        ...reservation,
        status: "COMPLETED",
        completed_at: new Date().toISOString(),
      };
      globalStore.reservations[resIdx] = updated;
      await saveStoreAsync(globalStore);

      // Broadcast pickup verified event to scanner stream
      await addScannerEventAsync({
        id: "pickup_" + Date.now(),
        barcode: clean,
        code: clean,
        name: "✅ Pickup Verified: " + (reservation.product?.name || "Item Handed Over"),
        category: reservation.product?.category || "OTHER",
        source: "expo_go_pickup_verifier",
        timestamp: Date.now(),
        is_pickup_verification: true,
        pickup_status: "COMPLETED",
      });

      return {
        success: true,
        type: "reservation",
        item: updated,
        message: "Customer pickup code " + clean + " verified successfully! Food handed over.",
      };
    }
  }

  // 2. Check Orders
  if (Array.isArray(globalStore.orders)) {
    const ordIdx = globalStore.orders.findIndex(
      (o) => (o.delivery_pin && o.delivery_pin.toUpperCase() === clean) ||
             (o.pickup_code && o.pickup_code.toUpperCase() === clean) ||
             o.id === clean
    );
    if (ordIdx !== -1) {
      const order = globalStore.orders[ordIdx];
      const updated = {
        ...order,
        status: "COMPLETED",
        completed_at: new Date().toISOString(),
      };
      globalStore.orders[ordIdx] = updated;
      await saveStoreAsync(globalStore);

      await addScannerEventAsync({
        id: "order_" + Date.now(),
        barcode: clean,
        code: clean,
        name: "✅ Order Verified: #" + order.id.slice(0, 8),
        source: "expo_go_order_verifier",
        timestamp: Date.now(),
        is_pickup_verification: true,
        pickup_status: "COMPLETED",
      });

      return {
        success: true,
        type: "order",
        item: updated,
        message: "Order pickup code " + clean + " verified successfully! Order completed.",
      };
    }
  }

  return {
    success: false,
    message: "Pickup code \"" + clean + "\" was not found among active orders.",
  };
}
