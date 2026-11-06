@echo off
rem Trendyol yorum senkronu - yerel zamanlanmis gorev icin.
rem Windows Task Scheduler bu dosyayi cagirabilir.
cd /d "%~dp0.."
npx tsx scripts/trendyol-reviews-sync.ts --delay=250 --max-pages=10
