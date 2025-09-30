/*
  Warnings:

  - You are about to drop the column `addressId` on the `Order` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Order" DROP CONSTRAINT "Order_addressId_fkey";

-- AlterTable
ALTER TABLE "public"."Order" DROP COLUMN "addressId",
ADD COLUMN     "shippingCity" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "shippingCountry" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "shippingEmail" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "shippingFullName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "shippingPhone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "shippingPostalCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "shippingState" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "shippingStreet" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "shippingTcNumber" TEXT;
