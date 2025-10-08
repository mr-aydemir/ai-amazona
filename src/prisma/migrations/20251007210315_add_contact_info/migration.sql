-- CreateTable
CREATE TABLE "ContactInfo" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "iban" TEXT,
    "taxNumber" TEXT,
    "mernisNumber" TEXT,
    "mapEmbed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactInfoTranslation" (
    "id" TEXT NOT NULL,
    "contactInfoId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "address" TEXT,

    CONSTRAINT "ContactInfoTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContactInfoTranslation_contactInfoId_locale_key" ON "ContactInfoTranslation"("contactInfoId", "locale");

-- AddForeignKey
ALTER TABLE "ContactInfoTranslation" ADD CONSTRAINT "ContactInfoTranslation_contactInfoId_fkey" FOREIGN KEY ("contactInfoId") REFERENCES "ContactInfo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
