-- AlterTable
ALTER TABLE "public"."Order" ALTER COLUMN "shippingCity" DROP DEFAULT,
ALTER COLUMN "shippingCountry" DROP DEFAULT,
ALTER COLUMN "shippingEmail" DROP DEFAULT,
ALTER COLUMN "shippingFullName" DROP DEFAULT,
ALTER COLUMN "shippingPhone" DROP DEFAULT,
ALTER COLUMN "shippingPostalCode" DROP DEFAULT,
ALTER COLUMN "shippingState" DROP DEFAULT,
ALTER COLUMN "shippingStreet" DROP DEFAULT;

-- CreateTable
CREATE TABLE "public"."SavedCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardUserKey" TEXT NOT NULL,
    "cardToken" TEXT NOT NULL,
    "cardAlias" TEXT NOT NULL,
    "cardFamily" TEXT,
    "cardAssociation" TEXT,
    "cardType" TEXT,
    "binNumber" TEXT,
    "lastFourDigits" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedCard_userId_cardToken_key" ON "public"."SavedCard"("userId", "cardToken");

-- AddForeignKey
ALTER TABLE "public"."SavedCard" ADD CONSTRAINT "SavedCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
