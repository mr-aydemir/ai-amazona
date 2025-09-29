-- AlterEnum
ALTER TYPE "public"."OrderStatus" ADD VALUE 'PAID';

-- AlterTable
ALTER TABLE "public"."Address" ADD COLUMN     "fullName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "phone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "tcNumber" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "iyzicoConversationId" TEXT,
ADD COLUMN     "iyzicoErrorMessage" TEXT,
ADD COLUMN     "iyzicoPaymentId" TEXT,
ADD COLUMN     "iyzicoPaymentStatus" TEXT,
ADD COLUMN     "iyzicoToken" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "shippingCost" DOUBLE PRECISION DEFAULT 0;
