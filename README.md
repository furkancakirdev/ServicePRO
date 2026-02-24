# ServicePro

ServicePro, tekne teknik servis operasyonlarını uçtan uca yöneten bir saha servis platformudur.  
Google Sheets ile çalışan ekipleri, planlama, iş emri, performans, raporlama ve geri bildirim döngüsünde tek bir operasyon sistemine toplar.

## Neyi Çözüyor?

Sektörde sık görülen operasyonel boşluklar ve ServicePro karşılıkları:

| Sektörel Problem | ServicePro Çözümü | İş Etkisi |
| --- | --- | --- |
| Dağınık takip (Excel, WhatsApp, telefon, sözlü not) | Tek merkezde iş emri, çağrı, lead, randevu ve bildirim yönetimi | Kaçan iş ve bilgi kaybı azalır |
| Planlama kaosu ve çakışan ekip atamaları | Gün/hafta dispatch planlama, randevu kartları, kilitleme ve taşıma akışı | Saha verimliliği artar |
| Öznel personel değerlendirmesi | Ağırlıklı puanlama, yetkili/rol bazlı değerlendirme, aylık performans ve rozet raporları | Adil ve ölçülebilir performans yönetimi |
| Sheet ve sistem verisi arasında tutarsızlık | Validate, reconcile, strict kontrol ve cron tabanlı sync | Veri güvenilirliği yükselir |
| Servis kapanışında eksik kayıt | İş emri kapanış akışı, not/ek yönetimi, kalite takibi | Denetlenebilir ve standart operasyon |
| Operasyon görünürlüğünün zayıf olması | Dashboard, operasyon özeti, teknisyen durumu, alert ve bildirim sistemi | Yönetim hızlı karar alır |
| Olası veri kayıpları | Backup, restore, retention ve health kontrolleri | İş sürekliliği güçlenir |

## Öne Çıkan Özellikler

- JWT tabanlı kimlik doğrulama ve RBAC (ADMIN / YETKILI)
- Whitelist kontrollü yetkili yönetimi
- İş emri yaşam döngüsü: oluşturma, atama, ilerletme, kapatma
- Randevu ve dispatch: gün/hafta görünümü, personel bazlı planlama
- Çağrı/booking yönetimi ve lead’e veya job’a dönüştürme akışları
- Pricebook (kategori + kalem) ve iş şablonları
- Notlar, ekler ve servis detay geçmişi
- Aylık puanlama, performans raporu, rozet kazananlar
- Proaktif alert kuralları ve bildirim merkezi
- Google Sheets senkronizasyonu (manuel + cron + doğrulama araçları)
- Dashboard istatistikleri ve hava durumu entegrasyonu
- Yedekleme/geri yükleme API’leri ve operasyonel script seti

## Teknik Yığın

- Frontend: Next.js 14 (App Router), React 18, TypeScript
- UI: Ant Design + Pro Components, Radix UI, Tailwind CSS
- Backend: Next.js API Routes
- Veri Katmanı: PostgreSQL + Prisma
- Auth: JWT (`jose`, `jsonwebtoken`)
- Takvim/Planlama: FullCalendar
- Raporlama/Görselleştirme: Recharts
- Test: Playwright, smoke ve regression script’leri
- Dağıtım: Docker Compose (NAS), Vercel, GitHub Actions

## Modül Haritası

- `app/`: Sayfalar ve API route’ları
- `components/`: Domain bazlı UI bileşenleri
- `lib/`: İş kuralları, sync, auth, backup, yardımcı katmanlar
- `prisma/`: Şema, migration ve seed
- `scripts/`: Sync, doğrulama, bakım ve test script’leri
- `playwright/` ve `e2e/`: Uçtan uca test senaryoları
- `docs/`: Mimari, durum, rehber ve operasyon dokümanları

## Başlarken

### 1) Depoyu klonla

```bash
git clone <repo-url>
cd ServicePro_Demo
```

### 2) Bağımlılıkları kur

```bash
npm ci
```

### 3) Ortam değişkenlerini hazırla

```bash
cp .env.example .env
```

### 4) Zorunlu değişkenleri doldur

| Değişken | Zorunluluk | Açıklama |
| --- | --- | --- |
| `DATABASE_URL` | Zorunlu | PostgreSQL bağlantı dizesi |
| `JWT_SECRET` | Zorunlu | Auth token imzalama anahtarı |
| `GOOGLE_SPREADSHEET_ID` | Opsiyonel | Sheet sync için |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Opsiyonel | Sheet sync için servis hesabı |
| `GOOGLE_PRIVATE_KEY` | Opsiyonel | Sheet sync için private key |
| `CRON_SECRET` | Önerilir | Cron endpoint güvenliği |
| `BACKUP_DIR` / `NAS_BACKUP_DIR` | Önerilir | Yedekleme klasörü |

### 5) Prisma ve veritabanı kurulumunu yap

```bash
npx prisma generate
npx prisma db push
```

İsteğe bağlı seed:

```bash
npm run db:seed
```

### 6) Uygulamayı çalıştır

```bash
npm run dev
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde açılır.

## Sık Kullanılan Komutlar

### Uygulama

```bash
npm run dev
npm run build
npm run start
```

### Kalite

```bash
npm run lint
npm run typecheck
npm test
npm run test:regression
npm run test:e2e
```

### Veritabanı

```bash
npm run db:generate
npm run db:push
npm run db:migrate
npm run db:studio
npm run db:seed
```

### Sync ve veri doğrulama

```bash
npm run sync:validate
npm run sync:validate:strict
npm run sync:reconcile
npm run sync:pull:validated
npm run sync:pull:reconcile
```

## Operasyon Akışı (Örnek)

1. Çağrı/booking kaydı alınır.
2. Booking lead’e veya doğrudan iş emrine dönüştürülür.
3. İş emri dispatch ekranında personel ve zaman ile planlanır.
4. Saha operasyonu tamamlanır, notlar/ekler girilir.
5. İş emri kapanışı ile puanlama ve performans verisi üretilir.
6. Dashboard, raporlar ve alert sistemi üzerinden yönetsel takip yapılır.

## Güvenlik ve Yönetişim

- JWT tabanlı oturum doğrulama
- Rol bazlı yetkilendirme (RBAC)
- Kritik akışlarda whitelist yaklaşımı
- Audit odaklı modelleme ve soft delete yaklaşımı
- Cron endpoint’lerinde secret doğrulama

## Dağıtım

### Docker Compose (NAS)

```bash
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml --profile ops run --rm migrate
docker compose -f docker-compose.prod.yml up -d
```

Detaylar: `DEPLOYMENT.md`

### Vercel

- `vercel.json` ve `.vercelignore` ile uyumlu yapı
- CI/CD akışları `.github/workflows/` altında

## CI/CD ve Otomasyon

- `ci.yml`: Kod kalitesi ve TR UI kalite kapısı
- `deploy.yml`: NAS ortamına SSH tabanlı deployment
- `sync-cron.yml`: 5 dakikada bir incremental sync tetikleme

## Proje Dokümantasyonu

- `docs/STRATEJI_VE_MIMARI.md`
- `docs/GUNCEL_DURUM_VE_REHBER.md`
- `docs/mevcut-durum.md`
- `DEPLOYMENT.md`
- `SECURITY.md`

## Katkı

1. Feature branch açın.
2. Değişiklikleri küçük ve test edilebilir parçalarda yapın.
3. `typecheck`, `test` ve ilgili e2e kontrollerini çalıştırın.
4. Pull request ile gönderin.

## Lisans

Bu depo kurum içi kullanım odaklıdır. Lisanslama ihtiyaçlarınıza göre proje sahibine göre özelleştirin.
