import EditProductClient from "./EditProductClient";

export async function generateStaticParams() {
  return [{ id: "1" }];
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <EditProductClient id={resolvedParams.id} />;
}
