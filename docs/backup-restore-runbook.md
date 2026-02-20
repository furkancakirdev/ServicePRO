# Backup Restore Runbook

Bu runbook, ServicePro ortaminda yedekleme ve geri yukleme operasyonlarini guvenli sekilde uygulamak icindir.

## 1) Hazirlik
- Uygulamaya `ADMIN` rolunde giris yap.
- `BACKUP_DIR` dizininin yazma/okuma yetkisini kontrol et.
- Geri yukleme oncesi aktif kullanicilara bakim penceresi bildirimi yap.

## 2) Manuel yedek olusturma
- API: `POST /api/yedekleme` veya `POST /api/backup`
- Govde: `{ "tur": "manuel" }`
- Beklenen sonuc:
  - HTTP `201`
  - Dosya adi: `servicepro-manual-YYYYMMDD-HHMMSS.json`
  - Yanitta `kayitSayisi` > 0

## 3) Otomatik yedek (cron) calistirma
- API: `POST /api/cron/backup`
- Standart retention: `7 gunluk + 4 haftalik`
- Opsiyonel govde:
  - `retentionModu`: `daily_weekly` veya `legacy_days`
  - `gunlukYedekSayisi`: varsayilan `7`
  - `haftalikYedekSayisi`: varsayilan `4`
  - `minimumYedekSayisi`: varsayilan `1`
  - `retentionGun` (`legacy_days` modu icin)
- Beklenen sonuc:
  - HTTP `200`
  - Dosya adi: `servicepro-auto-YYYYMMDD-HHMMSS.json`
  - `silinenDosyaSayisi`, `kalanYedekSayisi`, `retentionPolitikasi` alanlari doner.

## 4) Restore islemi
- API: `POST /api/backup/restore`
- Govde: `{ "dosyaAdi": "servicepro-manual-YYYYMMDD-HHMMSS.json" }`
- Islem adimlari (sistem tarafi):
  - Restore oncesi otomatik guvenlik yedegi alinir.
  - Tablolar restore sirasina gore temizlenir.
  - JSON verisi tablo tablo geri yuklenir.
- Beklenen sonuc:
  - HTTP `200`
  - `restoreEdilenKayitSayisi` > 0

## 5) Restore sonrasi dogrulama
- `GET /health` -> `status: ok`, `db: ok`
- `GET /api/services?limit=20` ile temel veri varligini kontrol et.
- Yedek listesinde son restore kaynak dosyasinin kayitli oldugunu dogrula.
- Gerekirse `playwright/tests/backup/restore.spec.ts` testi calistir.

## 6) Geri donus plani
- Restore sonrasi kritik hata gorulurse:
  - Restore oncesi alinan guvenlik yedegini `POST /api/backup/restore` ile geri yukle.
  - Sorun devam ederse bakim modunu koru ve incident kaydi ac.

