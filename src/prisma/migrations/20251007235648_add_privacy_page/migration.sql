-- CreateTable
CREATE TABLE "PrivacyPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivacyPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyPageTranslation" (
    "id" TEXT NOT NULL,
    "privacyPageId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "contentHtml" TEXT,

    CONSTRAINT "PrivacyPageTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrivacyPage_slug_key" ON "PrivacyPage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacyPageTranslation_privacyPageId_locale_key" ON "PrivacyPageTranslation"("privacyPageId", "locale");

-- AddForeignKey
ALTER TABLE "PrivacyPageTranslation" ADD CONSTRAINT "PrivacyPageTranslation_privacyPageId_fkey" FOREIGN KEY ("privacyPageId") REFERENCES "PrivacyPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
