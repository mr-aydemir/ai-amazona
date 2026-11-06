-- ETBİS registration link and generated QR badge
ALTER TABLE "SystemSetting"
  ADD COLUMN "etbisUrl" TEXT NOT NULL DEFAULT 'https://etbis.ticaret.gov.tr/tr/Home/SearchSiteResult?siteId=4ba20b4c-e8f6-4937-8688-28b01de357f5',
  ADD COLUMN "etbisQrImage" TEXT;
