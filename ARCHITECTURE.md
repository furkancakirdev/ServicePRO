# ServicePro Mimari Ozeti

Bu dokuman, uygulamanin guncel teknik yapisini ve veri akislarini ozetler.

## Teknoloji Yigini

- Frontend: Next.js 14, React 18, TypeScript
- UI: Tailwind CSS, Radix UI, tanstack/react-table, FullCalendar
- Backend: Next.js App Router API route'lari
- Veritabani: PostgreSQL
- ORM: Prisma
- Senkronizasyon: Google Sheets API (salt-okuma, Sheet -> App)

## Ana Klasor Yapisi

```text
ServicePro_Demo/
  app/
    api/
      sync/               # kanonik sync endpointleri
      cron/sync/          # 5 dk otomatik sync
      services/           # servis CRUD + complete
      personel|personnel/ # personel endpointleri
      puanlama/           # puanlama endpointleri
      stats/              # dashboard metrikleri
      weather/            # open-meteo proxysi
    servisler/
    takvim/
    planlama/
    puanlama/
    deger/
    ismail/
    ayarlar/
  components/
  lib/
    sync/                 # kanonik sync katmani
    auth/
    domain-mappers.ts
  prisma/
    schema.prisma
```

## Kanonik Veri Akisi

### Senkronizasyon

- Kaynak: Google Sheets (`GOOGLE_SPREADSHEET_ID`)
- Ana rota: `POST /api/sync`
- Otomatik rota: `GET /api/cron/sync`
- Durum: `GET /api/sync/status`
- Dogrulama: `GET /api/sync/validate`

Senaryo:

1. Sheet satirlari okunur (`lib/sync/sync-manager.ts`).
2. Header-first + fallback kolon cozumu yapilir.
3. Normalize islemleri uygulanir (durum, tarih, telefon, bos deger).
4. `TAMAMLANDI` ve `KESIF_KONTROL` satirlari PLANLAMA importunda dislanir.
5. Incremental veya full_reset modunda DB'ye yazilir.

### Deprecated Uyum Rotasi

- `GET/POST /api/sync/google-sheets` halen vardir.
- Veri yaziminda kanonik rotalara yonlendirir.
- Yanitta `x-deprecated-route` ve `x-canonical-route` header'lari doner.

## Servis Modulu

### Servis Listeleme

`GET /api/services` su filtreleri destekler:

- `date`, `dateFrom`, `dateTo`
- `sort`, `order`
- `adresGroup` (`YATMARIN`, `NETSEL`, `DIS_SERVIS`)
- `durum` (tekli/coklu)
- `tekneId`, `arama`, `page`, `limit`

### Servis Kapanis

`POST /api/services/[id]/complete`:

- personel atama (sorumlu/destek)
- kalite kontrol cevaplari
- bonus personel secimi
- puan hesaplama ve `ServisPuan` kaydi
- servis durumunu `TAMAMLANDI` olarak kapatma

## Dashboard ve Takvim

- `GET /api/stats`:
  - bugunun randevulu servisleri
  - bugunun devam eden servisleri
  - toplam bekleyen servisler
  - durum/is turu dagilimlari
- `GET /api/weather`:
  - Open-Meteo uzerinden mevcut hava durumu

## Guvenlik ve Yetkilendirme

- JWT tabanli kimlik dogrulama
- API'de rol kontrolu: `requireAuth`
- Kritik sync aksiyonlari:
  - incremental: `ADMIN`/`YETKILI`
  - full_reset: `ADMIN`
- Cron senkronizasyonu:
  - production'da `CRON_SECRET` kontrolu

## Veri Modeli Notlari

Temel tablolar:

- `Service`
- `Tekne`
- `Personel`
- `ServicePersonel`
- `ServisPuan`
- `KapanisRaporu`
- `SyncLog`
- `AuditLog`

Enum ve mapper katmani `types/index.ts` ve `lib/domain-mappers.ts` tarafinda merkezi olarak tutulur.
