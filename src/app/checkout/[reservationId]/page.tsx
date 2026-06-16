import CheckoutClient from "./CheckoutClient";

export async function generateStaticParams() {
  return [{ reservationId: "1" }];
}

export default async function Page({ params }: { params: Promise<{ reservationId: string }> }) {
  const resolvedParams = await params;
  return <CheckoutClient reservationId={resolvedParams.reservationId} />;
}
