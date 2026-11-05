import { NextResponse } from "next/server";
import {
  getScannerEventsAsync,
  addScannerEventAsync,
  clearScannerEventsAsync,
} from "@/lib/server-otp";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface ScannerBroadcastPayload {
  id: string;
  barcode: string;
  name?: string | null;
  brand?: string | null;
  category?: string | null;
  description?: string | null;
  suggested_price?: number | null;
  image_url?: string | null;
  timestamp: number;
  source?: string;
  is_pickup_verification?: boolean;
  pickup_status?: string;
}

// In-memory fallback buffer for sub-second responses within the same container
if (!(global as any).__EXPIRYGO_SCAN_BUFFER) {
  (global as any).__EXPIRYGO_SCAN_BUFFER = [] as ScannerBroadcastPayload[];
}

const getBuffer = (): ScannerBroadcastPayload[] => {
  return (global as any).__EXPIRYGO_SCAN_BUFFER;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const since = parseInt(searchParams.get("since") || "0", 10);

    // 1. Check in-memory buffer first for sub-second responses
    const buffer = getBuffer();
    const memLatest = buffer.length > 0 ? buffer[buffer.length - 1] : null;

    if (memLatest && memLatest.timestamp > since) {
      return NextResponse.json({
        success: true,
        scan: memLatest,
        all: buffer.filter((s) => s.timestamp > since),
        timestamp: Date.now(),
      });
    }

    // 2. Fetch from persistent shared store (Vercel Blob / disk)
    const persistentEvents = await getScannerEventsAsync(since);
    const latest = persistentEvents.length > 0 ? persistentEvents[0] : null;

    return NextResponse.json({
      success: true,
      scan: latest || null,
      all: persistentEvents,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, detail: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const barcode = (body.barcode || body.code || "").toString().trim();

    if (!barcode) {
      return NextResponse.json({ detail: "Barcode or code is required" }, { status: 400 });
    }

    const scanRecord: ScannerBroadcastPayload = {
      id: body.id || `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      barcode,
      name: body.name || null,
      brand: body.brand || null,
      category: body.category || null,
      description: body.description || null,
      suggested_price: body.suggested_price != null ? Number(body.suggested_price) : null,
      image_url: body.image_url || null,
      timestamp: Date.now(),
      source: body.source || "expo_go",
      is_pickup_verification: Boolean(body.is_pickup_verification),
      pickup_status: body.pickup_status,
    };

    // Store in in-memory buffer
    getBuffer().push(scanRecord);
    if (getBuffer().length > 30) {
      getBuffer().shift();
    }

    // Store in shared persistent store across all Vercel serverless containers
    await addScannerEventAsync(scanRecord);

    return NextResponse.json(
      {
        success: true,
        message: "Barcode broadcasted live to web companion",
        scan: scanRecord,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.message || "Failed to broadcast scan" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  (global as any).__EXPIRYGO_SCAN_BUFFER = [];
  await clearScannerEventsAsync();
  return NextResponse.json({ success: true, message: "Scanner buffer cleared" });
}
