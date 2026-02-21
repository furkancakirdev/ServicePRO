# ServicePro - Strateji ve Mimari Dokümanı

> **Doküman Amacı:** Projenin genel stratejik yönelimini, teknik mimari kararlarını, veri modellerini ve tasarım sistemini tek bir noktada toplamak.

---

## 1. Stratejik Vizyon ve Hedefler

### 1.1 Uzun Vadeli Vizyon

Marlin Yatçılık ServicePro sistemi, Türkiye'nin önde gelen yat bakım ve onarım sektöründe tam entegre bir kurumsal kaynak planlama (ERP) çözümü olmayı hedefler. Sistem; tekne sahipleri, teknisyenler, koordinatörler ve yönetim için merkezi bir platform sunarak operasyonel verimliliği artırmayı amaçlar.

### 1.2 Ana Hedefler

- **Operasyonel Mükemmellik:** Manuel süreçlerin (Google Sheets) minimize edilmesi
- **Veri Güvenliği:** Rol tabanlı erişim kontrolü (RBAC) ile verilerin korunması
- **Mobil Uyumluluk:** Teknisyenlerin sahada kolayca veri girişi yapabilmesi
- **Gerçek Zamanlı Takip:** Servis durumlarının anlık olarak izlenebilmesi

---

## 2. Teknik Mimari

### 2.1 Teknoloji Yığını (Stack)

| Katman | Teknoloji | Açıklama |
|--------|-----------|----------|
| **Frontend** | Next.js 14 (App Router) | React tabanlı modern framework |
| **Language** | TypeScript | Tip güvenli geliştirme |
| **Styling** | Tailwind CSS | Utility-first CSS framework |
| **UI Components** | Shadcn/UI, Radix UI | Erişilebilir UI bileşenleri |
| **Backend** | Next.js API Routes | Serverless/Edge API |
| **Database** | PostgreSQL (Neon Cloud) | İlişkisel veritabanı |
| **ORM** | Prisma | Type-safe database client |
| **Authentication** | JWT (Jose) | Token tabanlı auth |
| **Icons** | Lucide React | Modern ikon seti |
| **Calendar** | FullCalendar | Takvim bileşeni |
| **Charts** | Recharts | Grafik kütüphanesi |

### 2.2 Proje Yapısı

```
ServicePro_Demo/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── services/             # Servis CRUD
│   │   ├── sync/                 # Senkronizasyon
│   │   ├── puanlama/             # Puanlama sistemi
│   │   ├── raporlar/             # Raporlama
│   │   ├── dashboard-stats/      # Dashboard istatistikleri
│   │   ├── weather/              # Hava durumu
│   │   ├── personel/             # Personel yönetimi
│   │   ├── tekneler/             # Tekne yönetimi
│   │   ├── settings/             # Ayarlar
│   │   └── yedekleme/            # Yedekleme
│   ├── services/                 # Servis sayfaları
│   │   ├── page.tsx              # Servis listesi
│   │   ├── [id]/page.tsx         # Servis detayı
│   │   └── [id]/edit/page.tsx    # Servis düzenle
│   ├── servisler/                # Servisler sayfaları
│   ├── personel/                 # Personel sayfaları
│   ├── puanlama/                 # Puanlama sayfaları
│   ├── ayarlar/                  # Ayarlar sayfaları
│   ├── login/                    # Giriş sayfası
│   ├── profile/                  # Profil sayfası
│   ├── takvim/                   # Takvim sayfası
│   ├── raporlar/                 # Raporlar sayfası
│   ├── layout.tsx                # Ana layout
│   ├── page.tsx                  # Ana sayfa
│   └── globals.css               # Global stiller
├── components/                   # Ortak UI bileşenleri
│   ├── dashboard/                # Dashboard bileşenleri
│   │   ├── stats-cards.tsx       # İstatistik kartları
│   │   ├── operations-list.tsx   # Operasyon listesi
│   │   ├── technician-status.tsx # Teknisyen durumu
│   │   └── weather-widget.tsx    # Hava durumu widget'ı
│   ├── forms/                    # Form bileşenleri
│   │   └── service-form.tsx      # Servis formu
│   ├── services/                 # Servis tablosu bileşenleri
│   │   ├── data-table.tsx        # Ana data table
│   │   ├── columns.tsx           # Kolon tanımları
│   │   ├── data-table-toolbar.tsx # Toolbar
│   │   ├── data-table-faceted-filter.tsx # Filtreler
│   │   ├── services-empty-state.tsx    # Empty state
│   │   └── services-loading-skeleton.tsx # Loading skeleton
│   ├── table/                    # Table bileşenleri
│   ├── ui/                       # Shadcn/UI bileşenleri
│   ├── auth/                     # Auth bileşenleri
│   ├── Header.tsx                # Üst bar
│   ├── Sidebar.tsx               # Yan menü
│   ├── PageLayout.tsx            # Sayfa layout'u
│   └── ...                       # Diğer bileşenler
├── lib/                          # Utility fonksiyonlar
│   ├── auth/                     # Auth işlemleri
│   │   ├── api-auth.ts           # API auth
│   │   ├── auth-context.tsx      # Auth context
│   │   └── role.ts               # Rol tanımları
│   ├── sync/                     # Senkronizasyon mantığı
│   │   ├── index.ts              # Ana sync
│   │   ├── sync-manager.ts       # Sync yöneticisi
│   │   ├── sync-service.ts       # Sync servisi
│   │   ├── change-detector.ts   # Değişiklik tespiti
│   │   ├── sheet-config.ts       # Sheet yapılandırması
│   │   └── utils/                # Sync yardımcıları
│   ├── rbac/                     # Rol tabanlı erişim kontrolü
│   │   ├── permissions.ts        # İzinler
│   │   └── rbac.ts               # RBAC mantığı
│   ├── components/ui/            # UI bileşenleri
│   ├── config/                   # Yapılandırma
│   │   └── status-config.ts      # Durum yapılandırması
│   ├── hooks/                    # React hooks
│   ├── api.ts                    # API client
│   ├── prisma.ts                 # Prisma client
│   ├── google-sheets.ts          # Google Sheets client
│   ├── google-sheets-sync.ts     # Sync mantığı
│   ├── scoring-calculator.ts     # Puanlama hesaplayıcı
│   ├── report-generator.ts       # Rapor oluşturucu
│   ├── date-utils.ts             # Tarih yardımcıları
│   ├── domain-mappers.ts         # Domain mapper'lar
│   └── utils.ts                  # Genel yardımcılar
├── prisma/                       # Veritabanı
│   ├── schema.prisma             # Database şeması
│   └── seed.ts                   # Seed data
├── types/                        # TypeScript tanımları
│   └── index.ts                  # Global types
├── scripts/                      # Utility script'ler
│   ├── sync-*.ts                 # Senkronizasyon script'leri
│   ├── import-sheets-data.ts     # Import script'i
│   └── ...                       # Diğer script'ler
├── docs/                         # Dokümantasyon
│   ├── GOOGLE_SHEETS_SETUP.md    # Google Sheets kurulumu
│   ├── YENIDEN_YAPILANDIRMA_PLANI_v2.md # Yeniden yapılandırma planı
│   └── build-eperm-checklist.md # Build checklist
├── middleware.ts                 # Next.js middleware
├── next.config.js                # Next.js yapılandırması
├── tailwind.config.ts            # Tailwind yapılandırması
├── tsconfig.json                 # TypeScript yapılandırması
└── package.json                  # Proje bağımlılıkları
```

---

## 3. Veri Modeli ve Veritabanı

### 3.1 Ana Modeller

#### User (Kullanıcı)
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  ad            String
  role          UserRole  @default(YETKILI)
  aktif         Boolean   @default(true)
  emailVerified DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastLoginAt   DateTime?
  whitelistedYetkili Boolean @default(false)
}
```

#### Personel
```prisma
model Personel {
  id            String         @id @default(cuid())
  ad            String
  unvan         PersonelUnvan  @default(CIRAK)
  rol           String         @default("teknisyen")
  aktif         Boolean        @default(true)
  girisYili     Int?
  telefon       String?
  email         String?
  // ... diğer alanlar
}
```

#### Service (Servis)
```prisma
model Service {
  id               String        @id @default(cuid())
  tarih            DateTime?     @db.Date
  saat             String?
  isTuru           IsTuru        @default(PAKET)
  tekneId          String
  tekneAdi         String
  adres            String
  yer              String
  durum            ServisDurumu  @default(RANDEVU_VERILDI)
  zorlukSeviyesi    ZorlukSeviyesi?
  // ... diğer alanlar
}
```

#### Tekne
```prisma
model Tekne {
  id            String    @id @default(cuid())
  ad            String
  seriNo        String?   @unique
  marka         String?
  model         String?
  boyut         Float?
  motorTipi     String?
  // ... diğer alanlar
}
```

### 3.2 Enum'lar

#### UserRole
- `ADMIN` - Sistem yöneticisi
- `YETKILI` - Yetkili personel

#### PersonelUnvan
- `USTA` - Usta teknisyen
- `CIRAK` - Çırak teknisyen
- `YONETICI` - Yönetici
- `OFIS` - Ofis personeli

#### ServisDurumu
- `RANDEVU_VERILDI` - Randevu verildi
- `DEVAM_EDIYOR` - Devam ediyor
- `TAMAMLANDI` - Tamamlandı
- `KESIF_KONTROL` - Keşif kontrol
- `BEKLEMEDE` - Beklemede
- `IPTAL` - İptal

#### IsTuru
- `PAKET` - Paket iş
- `GARANTI` - Garanti iş
- `EKSTRA` - Ekstra iş

#### ZorlukSeviyesi
- `KOLAY` - Kolay
- `ORTA` - Orta
- `ZOR` - Zor

### 3.3 Temel Mimari Kararlar

- **Soft Delete:** Veriler fiziksel olarak silinmez, `deletedAt` alanı ile işaretlenir
- **Sync Logic:** Google Sheets -> Uygulama yönünde tek yönlü veri akışı
- **Audit Logging:** Kritik işlemler `AuditLog` tablosunda kayıt altına alınır
- **Timestamps:** Tüm tablolarda `createdAt` ve `updatedAt` alanları zorunludur

---

## 4. Tasarım Sistemi (UI/UX)

### 4.1 Renk Paleti (HSL)

| Kullanım | Değer | CSS |
|----------|-------|-----|
| **Primary (Mavi)** | `hsl(199 89% 48%)` | `--primary` |
| **Background (Koyu)** | `hsl(222 47% 11%)` | `--background` |
| **Surface** | `hsl(222 47% 14%)` | `--surface` |
| **Text (Açık)** | `hsl(210 40% 98%)` | `--foreground` |
| **Muted** | `hsl(217 33% 17%)` | `--muted` |
| **Border** | `hsl(217 33% 17%)` | `--border` |
| **Destructive (Kırmızı)** | `hsl(0 84% 60%)` | `--destructive` |
| **Success (Yeşil)** | `hsl(142 76% 36%)` | `--success` |
| **Warning (Sarı)** | `hsl(38 92% 50%)` | `--warning` |

### 4.2 Tasarım Prensipleri

- **Cam Görünümü (Glassmorphism):** Modern ve premium his için yarı saydam paneller
- **Gece Modu (Dark First):** Varsayılan olarak göz yormayan karanlık tema
- **Mikro Etkileşimler:** Hover efektleri ve yumuşak geçişler
- **Responsive:** Mobil, tablet ve masaüstü uyumlu tasarım
- **Accessibility:** WCAG 2.1 AA standartlarına uygun erişilebilirlik

### 4.3 Tipografi

- **Font:** Inter (Google Fonts)
- **Boyutlar:** `xs` (12px), `sm` (14px), `base` (16px), `lg` (18px), `xl` (20px), `2xl` (24px), `3xl` (30px)
- **Ağırlıklar:** `normal` (400), `medium` (500), `semibold` (600), `bold` (700)

---

## 5. Güvenlik ve Uyumluluk

### 5.1 Authentication

- **JWT Tabanlı Auth:** Tüm hassas API'lar middleware ile korunur
- **Token Süresi:** 7 gün
- **Storage:** localStorage + Cookie storage
- **Password Hashing:** bcryptjs ile hash'leme

### 5.2 Authorization

- **Rol Tabanlı Erişim Kontrolü (RBAC):** ADMIN ve YETKILI rolleri
- **Whitelist Kontrolü:** Sadece belirlenen yetkililer admin olabilir
- **Middleware Protection:** Kritik endpoint'ler middleware ile korunur

### 5.3 Input Validation

- **Zod Şemaları:** API seviyesinde doğrulama
- **TypeScript:** Tip güvenli geliştirme
- **Prisma:** SQL injection koruması

### 5.4 Audit Logging

Kritik işlemler `AuditLog` tablosunda kayıt altına alınır:
- Giriş/çıkış işlemleri
- Servis oluşturma/güncelleme/silme
- Puanlama işlemleri
- Ayar değişiklikleri

---

## 6. Performans Optimizasyonu

### 6.1 Database Optimizasyonu

- **Indexler:** Sık sorgulanan alanlarda index kullanımı
- **Relations:** Lazy loading ve eager loading optimizasyonu
- **Connection Pooling:** Prisma connection pooling

### 6.2 Frontend Optimizasyonu

- **Code Splitting:** Next.js otomatik code splitting
- **Image Optimization:** Next.js Image component
- **Lazy Loading:** Bileşen ve sayfa lazy loading
- **Memoization:** React.memo ve useMemo kullanımı

---

## 7. Gelecek Planları

### 7.1 Kısa Vadeli

- [ ] Dashboard'da eksik istatistik kartlarının eklenmesi
- [ ] Aylık katsayı yönetimi için Admin paneli
- [ ] Türkçe karakter bozukluklarının temizlenmesi
- [ ] WhatsApp rapor entegrasyonunun tamamlanması

### 7.2 Orta Vadeli

- [ ] Mobil uygulama (React Native)
- [ ] Gerçek zamanlı bildirimler (WebSocket)
- [ ] Gelişmiş raporlama ve analitik
- [ ] Müşteri portalı

### 7.3 Uzun Vadeli

- [ ] AI tabanlı tahminleme
- [ ] IoT entegrasyonu (tekneler için)
- [ ] Multi-tenant desteği
- [ ] Uluslararası genişleme

---

## 8. Kaynaklar

- [Next.js Dokümantasyonu](https://nextjs.org/docs)
- [Prisma Dokümantasyonu](https://www.prisma.io/docs)
- [Tailwind CSS Dokümantasyonu](https://tailwindcss.com/docs)
- [Shadcn/UI Dokümantasyonu](https://ui.shadcn.com)
