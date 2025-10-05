-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "serviceFee" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "preferredCurrency" TEXT NOT NULL DEFAULT 'TRY';
