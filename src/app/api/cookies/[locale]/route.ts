import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

  return NextResponse.json({
    pageId: page.id,
    locale: l,
    contentHtml: t?.contentHtml ?? "",
  });
}