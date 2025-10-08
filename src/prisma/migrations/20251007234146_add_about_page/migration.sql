-- CreateTable
CREATE TABLE "AboutPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AboutPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AboutPageTranslation" (
    "id" TEXT NOT NULL,
    "aboutPageId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "contentHtml" TEXT,

    CONSTRAINT "AboutPageTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AboutPage_slug_key" ON "AboutPage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AboutPageTranslation_aboutPageId_locale_key" ON "AboutPageTranslation"("aboutPageId", "locale");

-- AddForeignKey
ALTER TABLE "AboutPageTranslation" ADD CONSTRAINT "AboutPageTranslation_aboutPageId_fkey" FOREIGN KEY ("aboutPageId") REFERENCES "AboutPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
