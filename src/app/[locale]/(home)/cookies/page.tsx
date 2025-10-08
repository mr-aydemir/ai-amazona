import { headers } from "next/headers";

export default async function CookiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const p = await params;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const base = `${proto}://${host}`;

  const res = await fetch(`${base}/api/cookies/${p.locale}`, {
    next: { revalidate: 0 },
  });
  const data = await res.json();

  return (
    <div className="container mx-auto max-w-3xl p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Çerez Politikası</h1>
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: data.contentHtml || "" }} />
    </div>
  );
}