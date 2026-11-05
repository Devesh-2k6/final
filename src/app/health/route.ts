import { NextResponse } from "next/server";
import { ensureStoreLoaded, getAllProductsAsync } from "@/lib/server-otp";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const store = await ensureStoreLoaded();
    const products = await getAllProductsAsync();
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      productsCount: products.length,
      usersCount: Object.keys(store.users || {}).length,
      shopsCount: Object.keys(store.shops || {}).length,
      sampleProduct: products[0]?.name || null,
    });
  } catch (err: any) {
    return NextResponse.json({ status: "error", message: err.message }, { status: 500 });
  }
}

