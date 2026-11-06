-- Add multi-marketplace review source tracking
ALTER TABLE "Review" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'SITE';
ALTER TABLE "Review" ADD COLUMN "externalId" TEXT;

CREATE UNIQUE INDEX "Review_source_externalId_key" ON "Review"("source", "externalId");
