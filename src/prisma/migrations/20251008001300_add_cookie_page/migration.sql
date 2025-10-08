-- CreateTable
CREATE TABLE "CookiePage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CookiePage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CookiePageTranslation" (
    "id" TEXT NOT NULL,
    "cookiePageId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "contentHtml" TEXT,

    CONSTRAINT "CookiePageTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CookiePage_slug_key" ON "CookiePage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CookiePageTranslation_cookiePageId_locale_key" ON "CookiePageTranslation"("cookiePageId", "locale");

-- AddForeignKey
ALTER TABLE "CookiePageTranslation" ADD CONSTRAINT "CookiePageTranslation_cookiePageId_fkey" FOREIGN KEY ("cookiePageId") REFERENCES "CookiePage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
