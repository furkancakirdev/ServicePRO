# ServicePro - Marlin Yatçılık ERP Sistemi

Marlin Yatçılık için geliştirilmiş, Google Sheets senkronizasyonlu teknik servis takip ve personel puanlama sistemi.

## 📚 Dokümantasyon

Projenin tüm detayları aşağıdaki iki ana dokümanda toplanmıştır:

1. **[Strateji ve Mimari (STRATEJI_VE_MIMARI.md)](./STRATEJI_VE_MIMARI.md):** Projenin teknik yapısı, mimarisi, veri modelleri ve vizyonu.
2. **[Güncel Durum ve Rehber (GUNCEL_DURUM_VE_REHBER.md)](./GUNCEL_DURUM_VE_REHBER.md):** Kurulum adımları, kullanım klavuzu, son durum özeti ve sorun giderme rehberi.

## 🚀 Hızlı Başlatma

```bash
# Bağımlılıkları yükle
npm install

# Prisma Client oluştur
npx prisma generate

# Veritabanı şemasını uygula
npx prisma db push

# Geliştirme sunucusunu başlat
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışacaktır.

## 🎯 Temel Özellikler

### ✅ Tamamlanan Modüller

- **🔐 Kimlik Doğrulama:** JWT tabanlı güvenli giriş sistemi (ADMIN, YETKILI rolleri)
- **📋 Servis Yönetimi:** CRUD işlemleri, durum takibi, personel ataması
- **🔄 Google Sheets Senkronizasyonu:** Otomatik ve manuel senkronizasyon
- **📊 Puanlama Sistemi:** Yetkili, İsmail ve Teknisyen değerlendirme akışları
- **👥 Personel Yönetimi:** Usta, Çırak, Yönetici ve Ofis personeli takibi
- **🚤 Tekne Yönetimi:** Müşteri tekneleri ve detayları
- **📈 Dashboard:** İstatistik kartları, operasyon listesi, teknisyen durumu
- **🌤️ Hava Durumu Entegrasyonu:** Lokasyon bazlı hava durumu bilgileri
- **🎨 Modern UI/UX:** Shadcn/UI bileşenleri, karanlık tema, glassmorphism tasarım

### 📁 Proje Yapısı

```
ServicePro_Demo/
├── app/                    # Next.js App Router (Pages & API)
│   ├── api/               # API Routes
│   │   ├── auth/          # Giriş/Çıkış işlemleri
│   │   ├── services/      # Servis CRUD
│   │   ├── sync/          # Senkronizasyon
│   │   ├── puanlama/      # Puanlama sistemi
│   │   └── raporlar/      # Raporlama
│   ├── components/        # UI Bileşenleri
│   ├── services/          # Servis sayfaları
│   ├── personel/          # Personel sayfaları
│   ├── puanlama/          # Puanlama sayfaları
│   ├── ayarlar/           # Ayarlar sayfaları
│   └── layout.tsx         # Ana layout
├── components/            # Ortak UI bileşenleri
│   ├── dashboard/         # Dashboard bileşenleri
│   ├── forms/             # Form bileşenleri
│   ├── services/          # Servis tablosu bileşenleri
│   └── ui/                # Shadcn/UI bileşenleri
├── lib/                   # Utility fonksiyonlar
│   ├── auth/              # Auth işlemleri
│   ├── sync/              # Senkronizasyon mantığı
│   ├── rbac/              # Rol tabanlı erişim kontrolü
│   └── api.ts             # API client
├── prisma/                # Veritabanı şeması
└── types/                 # TypeScript tanımları
```

## 🔧 Teknoloji Yığını

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Veritabanı:** PostgreSQL (Neon Cloud)
- **ORM:** Prisma
- **Kimlik Doğrulama:** JWT (Jose)
- **UI Kütüphanesi:** Shadcn/UI, Radix UI, Lucide Icons
- **Takvim:** FullCalendar
- **Grafik:** Recharts

## 📝 Önemli Komutlar

```bash
# Geliştirme
npm run dev              # Geliştirme sunucusu
npm run build            # Production build
npm run build:strict     # Katı build (lint ile)

# Veritabanı
npm run db:generate      # Prisma Client oluştur
npm run db:push          # Schema'yı uygula
npm run db:migrate       # Migration oluştur
npm run db:studio        # Prisma Studio aç
npm run db:seed          # Örnek verileri yükle
npm run db:reset         # Veritabanını sıfırla

# Senkronizasyon
npm run sync:validate    # Senkronizasyon doğrulaması
npm run sync:reconcile   # Sheet-DB uyumluluk kontrolü

# Testler
npm test                 # Smoke test
npm run test:regression  # Regresyon testi
```

## 🔐 Ortam Değişkenleri

`.env` dosyası oluşturun ve aşağıdaki değişkenleri doldurun:

```env
# Veritabanı
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

# JWT Secret
JWT_SECRET="güçlü-bir-secret-key"

# Google Sheets
GOOGLE_SPREADSHEET_ID="sheet-id"
GOOGLE_SERVICE_ACCOUNT_EMAIL="service-account@project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## 📄 Lisans

© 2026 Marlin Yatçılık. Tüm hakları saklıdır.
