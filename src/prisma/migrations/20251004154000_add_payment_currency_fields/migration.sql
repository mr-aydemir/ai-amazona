-- AlterTable
ALTER TABLE "public"."Order" ADD COLUMN     "paymentCurrency" TEXT;
ALTER TABLE "public"."Order" ADD COLUMN     "paidAmount" DOUBLE PRECISION;
ALTER TABLE "public"."Order" ADD COLUMN     "conversionRate" DOUBLE PRECISION;
ALTER TABLE "public"."Order" ADD COLUMN     "rateTimestamp" TIMESTAMP(3);
ALTER TABLE "public"."Order" ADD COLUMN     "baseCurrencyAtPayment" TEXT;