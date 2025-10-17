import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sanitizeRichHtml } from "@/lib/sanitize-html";

function normalizeLocale(locale?: string) {
  return (locale ?? "tr").toLowerCase().split("-")[0];
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ locale: string }> }
) {
  const params = await context.params;
  const l = normalizeLocale(params.locale);

  let page = await prisma.page.findUnique({ where: { slug: "cookies" } });
  if (!page) {
    page = await prisma.page.create({ data: { slug: "cookies" } });
  }

  const t = await prisma.pageTranslation.findUnique({
    where: { pageId_locale: { pageId: page.id, locale: l } },
  });

  const content = sanitizeRichHtml(t?.contentHtml ?? "");
  return NextResponse.json({
    pageId: page.id,
    locale: l,
    contentHtml: content,
  });
}