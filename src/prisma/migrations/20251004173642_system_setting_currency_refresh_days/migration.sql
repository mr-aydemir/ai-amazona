-- DropForeignKey
ALTER TABLE "public"."Review" DROP CONSTRAINT "Review_userId_fkey";

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "guestEmail" TEXT,
ADD COLUMN     "guestName" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SystemSetting" ADD COLUMN     "currencyRefreshDays" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "lastRatesUpdateAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
