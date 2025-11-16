-- Add filterable flag to Attribute model
ALTER TABLE "Attribute" ADD COLUMN IF NOT EXISTS "filterable" BOOLEAN NOT NULL DEFAULT false;