-- CreateTable
CREATE TABLE "TermsPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TermsPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TermsPageTranslation" (
    "id" TEXT NOT NULL,
    "termsPageId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "contentHtml" TEXT,

    CONSTRAINT "TermsPageTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TermsPage_slug_key" ON "TermsPage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TermsPageTranslation_termsPageId_locale_key" ON "TermsPageTranslation"("termsPageId", "locale");

-- AddForeignKey
ALTER TABLE "TermsPageTranslation" ADD CONSTRAINT "TermsPageTranslation_termsPageId_fkey" FOREIGN KEY ("termsPageId") REFERENCES "TermsPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
