import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { sanitizeRichHtml } from "@/lib/sanitize-html";

const PutSchema = z.object({
  locale: z.string().min(2).max(8),
  contentHtml: z.string().optional(),
});

function normalizeLocale(locale?: string) {
  return (locale ?? "tr").toLowerCase().split("-")[0];
}

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let page = await prisma.page.findUnique({ where: { slug: "cookies" } });
  if (!page) {
    page = await prisma.page.create({ data: { slug: "cookies" } });
  }

  const translations = await prisma.pageTranslation.findMany({
    where: { pageId: page.id },
  });

  const list = translations.map((t) => ({
    locale: normalizeLocale(t.locale),
    contentHtml: t.contentHtml ?? "",
  }));

  return NextResponse.json({ page, translations: list });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json();
  const parsed = PutSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
  }

  const { locale, contentHtml } = parsed.data;
  const l = normalizeLocale(locale);

  let page = await prisma.page.findUnique({ where: { slug: "cookies" } });
  if (!page) {
    page = await prisma.page.create({ data: { slug: "cookies" } });
  }

  const safe = sanitizeRichHtml(contentHtml ?? "");
  const updated = await prisma.pageTranslation.upsert({
    where: { pageId_locale: { pageId: page.id, locale: l } },
    create: { pageId: page.id, locale: l, contentHtml: safe },
    update: { contentHtml: safe },
  });

  return NextResponse.json({ success: true, translation: updated });
}