/*
  Warnings:

  - Made the column `preferredLocale` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- First, update existing NULL values to default 'tr'
UPDATE "User" SET "preferredLocale" = 'tr' WHERE "preferredLocale" IS NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "preferredLocale" SET NOT NULL,
ALTER COLUMN "preferredLocale" SET DEFAULT 'tr';
