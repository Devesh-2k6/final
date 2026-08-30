"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import EditProductClient from "./EditProductClient";

// Static export cannot pre-render arbitrary dynamic params, so the product id
// is passed as a query string (/shop/products/edit?id=<uuid>) and read here.
function EditProductParamBridge() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") || "";
  return <EditProductClient id={id} />;
}

export default function EditProductPage() {
  return (
    <Suspense fallback={null}>
      <EditProductParamBridge />
    </Suspense>
  );
}
