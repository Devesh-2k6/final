import { NextResponse } from "next/server";
import { verifyPickupCodeAsync } from "@/lib/server-otp";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code = (body.code || body.pickup_code || body.barcode || "").toString().trim();

    if (!code) {
      return NextResponse.json({ detail: "Pickup code is required." }, { status: 400 });
    }

    const result = await verifyPickupCodeAsync(code);

    if (!result.success) {
      return NextResponse.json(
        { success: false, detail: result.message },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      type: result.type,
      item: result.item,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, detail: err.message || "Failed to verify pickup code" },
      { status: 500 }
    );
  }
}
