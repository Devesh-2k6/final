"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CheckoutClient from "./CheckoutClient";

// Static export cannot pre-render arbitrary dynamic params, so the reservation
// id is passed as a query string (/checkout?rid=<uuid>) and read on the client.
function CheckoutParamBridge() {
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("rid") || "";
  return <CheckoutClient reservationId={reservationId} />;
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutParamBridge />
    </Suspense>
  );
}
