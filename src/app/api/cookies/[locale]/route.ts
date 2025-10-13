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

  let page = await prisma.cookiePage.findFirst();
  if (!page) {
    page = await prisma.cookiePage.create({ data: { slug: "cookies" } });
  }

  const t = await prisma.cookiePageTranslation.findUnique({
    where: { cookiePageId_locale: { cookiePageId: page.id, locale: l } },
  });

  const content = sanitizeRichHtml(t?.contentHtml ?? "");
  return NextResponse.json({
    pageId: page.id,
    locale: l,
    contentHtml: content,
  });
}