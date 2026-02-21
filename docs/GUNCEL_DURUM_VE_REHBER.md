# ServicePro - Güncel Durum ve Rehber

> **Doküman Amacı:** Projenin son durumunu, kurulum adımlarını, operasyonel kullanımını ve karşılaşılan sorunların çözümlerini içeren yaşayan bir rehber.

---

## 1. Proje Durumu (Şubat 2026)

### 1.1 Tamamlanan Ana Başlıklar

- **🔐 Kimlik Doğrulama Sistemi:**
  - JWT tabanlı güvenli giriş/çıkış
  - Rol tabanlı erişim kontrolü (RBAC)
  - ADMIN ve YETKILI rolleri
  - Whitelist kontrolü (sadece belirlenen yetkililer admin olabilir)

- **🔄 Senkronizasyon (Sync):**
  - `lib/sync/*` altında kanonik hale getirildi
  - Header bazlı eşleme ve hata raporlama güçlendirildi
  - Manuel ve otomatik sync API'ları
  - Validation ve reconcile araçları

- **📋 Servis Yönetimi:**
  - CRUD işlemleri tamamen aktif
  - Durum bazlı filtreleme (RANDEVU_VERILDI, DEVAM_EDİYOR, TAMAMLANDI vb.)
  - Personel atama sistemi
  - Servis kapanış modalı
  - Zorluk seviyesi seçimi (Admin override)

- **📊 Puanlama Modülü:**
  - Yetkili değerlendirme akışı (Usta ve Çırak için)
  - İsmail değerlendirme sistemi
  - Aylık performans hesaplama
  - Rozet kazananlar raporu
  - Ağırlıklı puanlama sistemi

- **👥 Personel Yönetimi:**
  - Usta, Çırak, Yönetici ve Ofis personeli takibi
  - Personel detay sayfası
  - Aktif/pasif durum yönetimi

- **🚤 Tekne Yönetimi:**
  - Müşteri tekneleri ve detayları
  - Marka, model, motor bilgileri
  - Aktif/pasif durum yönetimi

- **📈 Dashboard:**
  - İstatistik kartları (Toplam servis, aktif personel, tamamlanan işler)
  - Operasyon listesi
  - Teknisyen durumu widget'ı
  - Hava durumu entegrasyonu

- **🎨 UI/UX:**
  - Shadcn/UI tabanlı premium tema
  - Glassmorphism tasarım
  - Karanlık tema (varsayılan)
  - Responsive tasarım
  - Data table ile gelişmiş listeleme
  - Loading skeleton'lar ve empty state'ler

### 1.2 API Endpoints

#### Authentication
- `POST /api/auth/login` - Giriş
- `POST /api/auth/logout` - Çıkış
- `GET /api/auth/me` - Mevcut kullanıcı bilgisi

#### Servisler
- `GET /api/services` - Tüm servisleri listele
- `POST /api/services` - Yeni servis oluştur
- `GET /api/services/[id]` - Servis detayı
- `PUT /api/services/[id]` - Servis güncelle
- `DELETE /api/services/[id]` - Servis sil
- `POST /api/services/[id]/complete` - Servis kapat

#### Senkronizasyon
- `POST /api/sync` - Manuel senkronizasyon
- `GET /api/sync/status` - Sync durumu
- `GET /api/sync/validate` - Validasyon
- `POST /api/sync/google-sheets` - Google Sheets sync
- `POST /api/sync/full-reset` - Tam sıfırlama

#### Puanlama
- `GET /api/puanlama/aylik` - Aylık puanlama
- `GET /api/puanlama/yetkili` - Yetkili puanlama
- `GET /api/puanlama/ismail` - İsmail puanlama

#### Raporlar
- `GET /api/raporlar/aylik-performans` - Aylık performans raporu
- `GET /api/raporlar/rozet-kazananlar` - Rozet kazananlar

#### Diğer
- `GET /api/dashboard-stats` - Dashboard istatistikleri
- `GET /api/weather` - Hava durumu
- `GET /api/weather/locations` - Hava durumu lokasyonları
- `GET /api/personel` - Personel listesi
- `GET /api/personel/[id]` - Personel detayı
- `GET /api/tekneler` - Tekneler listesi
- `GET /api/settings` - Ayarlar
- `POST /api/yedekleme` - Yedekleme

### 1.3 Bekleyen ve Devam Eden İşler

- [ ] Dashboard'da eksik istatistik kartlarının eklenmesi
- [ ] Aylık katsayı yönetimi için Admin paneli
- [ ] Geriye kalan Türkçe karakter bozukluklarının temizlenmesi
- [ ] WhatsApp rapor entegrasyonunun tamamlanması
- [ ] Takvim sayfasının aktifleştirilmesi

---

## 2. Kurulum Rehberi

### 2.1 Gereksinimler

- **Node.js** 18 veya üzeri
- **PostgreSQL** (Neon Cloud veya yerel)
- **Google Cloud Service Account** (Sync için)

### 2.2 Hızlı Başlangıç

```bash
# 1. Projeyi klonla
git clone <repository-url>
cd ServicePro_Demo

# 2. Bağımlılıkları yükle
npm install

# 3. Ortam değişkenlerini ayarla
cp .env.example .env
# .env dosyasını düzenle

# 4. Prisma Client oluştur
npx prisma generate

# 5. Veritabanı şemasını uygula
npx prisma db push

# 6. Örnek verileri yükle (isteğe bağlı)
npm run db:seed

# 7. Uygulamayı başlat
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışacaktır.

### 2.3 Ortam Değişkenleri (.env)

```env
# Veritabanı
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

# JWT Secret (güçlü bir string kullanın)
JWT_SECRET="guclu-bir-secret-key-buraya"

# Google Sheets
GOOGLE_SPREADSHEET_ID="1abc...xyz"
GOOGLE_SERVICE_ACCOUNT_EMAIL="service-account@project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 2.4 Google Sheets Setup

1. Google Cloud Console'da bir proje oluşturun
2. Service Account oluşturun ve JSON key indirin
3. JSON dosyasındaki `private_key` değerini `.env` dosyasına ekleyin
4. Service Account email'ini Google Sheets üzerinde "Editör" olarak ekleyin

Detaylı bilgi için [GOOGLE_SHEETS_SETUP.md](./docs/GOOGLE_SHEETS_SETUP.md) dosyasını inceleyin.

---

## 3. Kullanım Rehberi

### 3.1 Google Sheets Senkronizasyonu

**Manuel Sync:**
- `POST /api/sync` endpoint'i ile tetiklenebilir
- UI üzerindeki senkronizasyon butonu ile tetiklenebilir

**Kural:**
- `TAMAMLANDI` ve `KESIF_KONTROL` durumundaki satırlar import edilmez
- Soft delete uygulanır (`deletedAt` alanı ile işaretlenir)

**Validation:**
- `GET /api/sync/validate` ile Sheet-DB uyumsuzluğu kontrol edilir
- `npm run sync:validate` komutu ile CLI'den kontrol yapılabilir

### 3.2 Servis Kapatma ve Puanlama

**Adımlar:**
1. Servis detay sayfasına gidin
2. "Kapat" butonuna tıklayın
3. Personel ataması yapın
4. Kalite kontrol sorularını yanıtlayın
5. Bonus seçimlerini yapın
6. Puan otomatik hesaplanarak kaydedilir

### 3.3 Puanlama Sistemi

**Yetkili Puanlama:**
- Usta ve Çırak personel için ayrı değerlendirme
- Aylık performans hesaplaması
- Rozet sistemi

**İsmail Puanlama:**
- Özel değerlendirme kriterleri
- Ayrı hesaplama algoritması

---

## 4. Sorun Giderme (Troubleshooting)

### 4.1 Database Bağlantı Hataları

**Belirtiler:**
- `Connection refused` hatası
- `Invalid connection string` hatası

**Çözümler:**
- `.env` içindeki `DATABASE_URL`'i kontrol edin
- PostgreSQL sunucusunun çalıştığından emin olun
- `sslmode=require` parametresinin Neon Cloud için eklendiğinden emin olun

### 4.2 Senkronizasyon Hataları

**Belirtiler:**
- `Permission denied` hatası
- `Sheet not found` hatası

**Çözümler:**
- Google Service Account email'inin Sheet üzerinde "Editör" yetkisi olduğundan emin olun
- `GOOGLE_SPREADSHEET_ID`'nin doğru olduğundan emin olun
- Kolon başlıklarının eşleştiğini `npm run sync:validate` ile kontrol edin

### 4.3 Build Hataları

**Belirtiler:**
- TypeScript tip hataları
- ESLint hataları

**Çözümler:**
```bash
# Tip kontrolü
npm run typecheck

# Lint kontrolü
npm run lint

# Katı build
npm run build:strict
```

### 4.4 Temizlik ve Yeniden Başlatma

```bash
# Her şeyin temizlenip baştan kurulması için
rm -rf node_modules .next .prisma
npm install
npx prisma generate
npx prisma db push
```

---

## 5. Önemli Komutlar

```bash
# Geliştirme
npm run dev              # Geliştirme sunucusu (http://localhost:3000)
npm run build            # Production build
npm run build:strict     # Katı build (lint ile)
npm run start            # Production sunucusu

# Veritabanı
npm run db:generate      # Prisma Client oluştur
npm run db:push          # Schema'yı uygula
npm run db:migrate       # Migration oluştur
npm run db:studio        # Prisma Studio aç
npm run db:seed          # Örnek verileri yükle
npm run db:reset         # Veritabanını sıfırla

# Senkronizasyon
npm run sync:validate    # Senkronizasyon doğrulaması
npm run sync:validate:strict  # Katı validasyon
npm run sync:reconcile   # Sheet-DB uyumluluk kontrolü
npm run sync:reconcile:dry  # Dry-run reconcile

# Testler
npm test                 # Smoke test
npm run test:regression  # Regresyon testi
```

---

## 6. Destek ve İletişim

Sorunlar ve öneriler için proje yöneticisi ile iletişime geçin.
