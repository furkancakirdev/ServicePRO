# ServicePro

Tekne teknik servis operasyonu, Google Sheets senkronizasyonu ve personel puanlama modüllerini bir arada yöneten Next.js tabanli uygulama.

## Hizli Baslangic

```bash
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Uygulama: <http://localhost:3000>

## Temel Komutlar

```bash
# kalite
npm run lint
npm run typecheck
npm test
npm run build:strict

# senkronizasyon dogrulama
npm run sync:validate
npm run sync:validate:strict
npm run sync:reconcile
```

## Ortam Degiskenleri

`.env` dosyasinda asagidaki alanlar beklenir:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
CRON_SECRET="..."

# Google Sheets
GOOGLE_SPREADSHEET_ID="1IGa23ZXugvCGblp4GtE2Tl06Z2mnZ2VxIM_F6vyolVs"
GOOGLE_SERVICE_ACCOUNT_EMAIL="..."
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
# veya GOOGLE_SERVICE_ACCOUNT_JSON="service-account.json"

# Dashboard hava durumu (opsiyonel)
WEATHER_LAT="36.8547"
WEATHER_LON="28.2742"
WEATHER_TIMEZONE="Europe/Istanbul"
```

## Sayfalar

| Yol | Aciklama |
|---|---|
| `/` | Dashboard (istatistik + hava durumu) |
| `/servisler` | Servis listesi, filtreleme ve siralama |
| `/servisler/[id]` | Servis detay / duzenleme |
| `/takvim` | Takvim gorunumu |
| `/planlama` | Planlama ekrani |
| `/personel` | Personel yonetimi |
| `/puanlama` | Aylik puanlama tablosu |
| `/deger` | Yetkili degerlendirme |
| `/ismail` | Ismail degerlendirme |
| `/marlin-yildizi` | Servis kapanis puanlama akisi |
| `/raporlar` | Aylik raporlar |
| `/gecmis-klasman` | Gecmis klasman |
| `/ayarlar` | Sync ve sistem ayarlari |

## API Kisa Ozeti

Kanonik senkronizasyon endpointleri:

- `POST /api/sync` (manuel)
- `GET /api/cron/sync` (otomatik/cron)
- `GET /api/sync/status`
- `GET /api/sync/validate`

Not: `GET/POST /api/sync/google-sheets` geriye donuk uyumluluk icin durur, kanonik rotalara yonlendirir (`x-deprecated-route` header).

Servis endpointleri:

- `GET /api/services` (`date`, `dateFrom`, `dateTo`, `sort`, `order`, `adresGroup`, `durum[]` destekler)
- `POST /api/services`
- `GET /api/services/[id]`
- `PUT /api/services/[id]`
- `POST /api/services/[id]/complete`

Diger:

- `GET /api/stats`
- `GET /api/weather`
- `GET /api/personel`, `PUT /api/personel/[id]`
- `GET /api/personnel`, `PUT /api/personnel/[id]` (uyumluluk/alternatif yol)

## Roller

| Rol | Yetki |
|---|---|
| `ADMIN` | Tam erisim, full reset ve ayar degisiklikleri |
| `YETKILI` | Operasyonel yonetim, degerlendirme/senkron izleme |
| `TEKNISYEN` | Kisitli goruntuleme/operasyon |

## Dokumantasyon

- `ARCHITECTURE.md`: mimari, veri akisi, moduller
- `FEATURES.md`: fonksiyonel kapsam ve mevcut davranis
- `PROJECT_STATUS.md`: tamamlanan isler ve acik kalemler
