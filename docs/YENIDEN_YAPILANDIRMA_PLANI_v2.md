# ServicePro - Kapsamlı Yeniden Yapılandırma ve Google Sheets Entegrasyon Planı

**Doküman Tarihi:** 4 Şubat 2026  
**Proje:** Marlin Yatçılık - Tekne Servis Takip ve ERP Sistemi  
**Versiyon:** 2.0

---

## 1. Mevcut Durum Analizi

### 1.1 Proje Yapısı Değerlendirmesi

ServicePro projesi, Marlin Yatçılık'ın teknik servis operasyonlarını yönetmek üzere tasarlanmış kapsamlı bir ERP sistemidir. Mevcut durumda proje büyük ölçüde olgunlaşmış bir yapıya sahip olmakla birlikte, production kullanımı için bazı kritik iyileştirmelere ihtiyaç duymaktadır. Sistem Next.js 14 App Router mimarisi üzerine inşa edilmiş olup, TypeScript ve Prisma ORM ile geliştirilmektedir. PostgreSQL veritabanı olarak Neon'un serverless çözümü kullanılmakta ve Google Sheets ile entegrasyon altyapısı mevcuttur.

Projenin en güçlü yönlerinden biri JWT tabanlı authentication sistemidir. Middleware seviyesinde route koruması uygulanmış, rol bazlı erişim kontrolü (RBAC) aktif olarak çalışmaktadır. Admin, Yetkili, Teknisyen ve Müşteri rolleri tanımlanmış olup, her rol için farklı yetki seviyeleri belirlenmiştir. Auth context ve hook'lar global olarak erişilebilir durumda ve tüm sayfalarda kullanıcı bilgilerine erişim sağlanmaktadır.

Prisma şeması 15 model içeren kapsamlı bir yapı sunmaktadır. User, Personel, Tekne, Service, ServicePersonel, ParcaBekleme, KapanisRaporu, ServisPuan, YetkiliDegerlendirmeUsta, YetkiliDegerlendirmeCirak, IsmailDegerlendirme, AylikPerformans, AuditLog ve Setting modelleri birbirleriyle ilişkilendirilmiş durumdadır. Tüm modellerde soft delete (deletedAt) desteği mevcuttur ve audit logging altyapısı kurulmuştur.

### 1.2 Tamamlanmış Modüller

Authentication ve Güvenlik Sistemi başarıyla tamamlanmış modüllerin başında gelmektedir. JWT token oluşturma, doğrulama ve çözme fonksiyonları lib/utils/auth.ts dosyasında implement edilmiştir. Token'lar 7 gün geçerlilik süresine sahip ve HS256 algoritması ile imzalanmaktadır. Middleware.ts dosyası tüm route'ları korumakta, public route'lar whitelist mantığıyla yönetilmektedir. lib/auth/auth-context.tsx dosyasında React Context API ile entegre auth yönetimi sağlanmıştır.

Veritabanı şeması da büyük ölçüde tamamlanmış durumdadır. User modeli email, passwordHash, rol ve aktif durum alanlarını içermektedir. Personel modeli USTA, CIRAK, YONETICI ve OFIS unvanlarını desteklemektedir. Service modeli tekne servis kayıtlarını, durum takibini ve personel atamalarını yönetmektedir. Puanlama sistemi için gerekli tüm modeller (ServisPuan, YetkiliDegerlendirmeUsta, YetkiliDegerlendirmeCirak, IsmailDegerlendirme, AylikPerformans) tanımlanmıştır.

API Routes yapısı da temel düzeyde kurulmuştur. /api/auth/ altında login, logout, me ve register endpoint'leri mevcuttur. Login endpoint'i email validasyonu, şifre doğrulama, son giriş zamanı güncelleme ve audit log kaydı yapmaktadır. Şifre hash'leme için bcryptjs kullanılmaktadır. /api/stats endpoint'i dashboard için gerekli tüm aggregate sorguları içermektedir.

### 1.3 Eksik veya İyileştirilmesi Gereken Alanlar

UI Component Library projenin en kritik eksiklerinden biridir. Merkezi bir bileşen kütüphanesi bulunmamakta, Button, Input, Card, Table, Modal gibi temel bileşenler her sayfada ayrı ayrı ve tutarsız şekilde tanımlanmış durumdadır. Tailwind CSS kullanılmasına rağmen, design system kuralları (renk paleti, tipografi, spacing) tek bir config dosyasında standartlaştırılmamıştır. CSS variables globals.css dosyasında tanımlanmış ancak Tailwind config ile tam entegre değildir.

Service Management CRUD işlemleri tamamlanmamıştır. Servis oluşturma, düzenleme ve silme işlemleri için sayfalar mevcut olsa da form validasyonu ve veritabanı entegrasyonu tam olarak çalışmamaktadır. Servis detay sayfalarında personel atama, parça bekleme takibi ve kapanış raporu özellikleri pasif durumdadır. Özellikle Yeni Servis Ekleme formu (app/planlama/yeni/page.tsx) Google Sheets'ten veri çekme özelliğine sahip değildir.

Personel Yönetimi CRUD işlemleri de benzer şekilde tamamlanmamıştır. Personel listesi mevcut ancak tam CRUD işlevselliği eksiktir. Yeni personel ekleme formu sınırlı alanlarla çalışmaktadır. Performans geçmişi ve değerlendirme sayfaları sadece görüntüleme amaçlıdır. Puanlama sistemi frontend'i çalışmamaktadır.

Google Sheets Senkronizasyonu en kritik eksiklerden biridir. lib/google-sheets.ts dosyasında read-only fonksiyonlar mevcuttur ancak two-way sync bulunmamaktadır. Yeni bir tekne veya personel eklendiğinde bu veri Google Sheets'e yansımamaktadır. Aynı şekilde Google Sheets'e eklenen bir kayıt uygulamaya otomatik olarak aktarılmamaktadır. Cron job yapılandırılmamış ve otomatik senkronizasyon çalışmamaktadır.

### 1.4 Google Sheets Entegrasyon Durumu

Mevcut Google Sheets entegrasyonu tek yönlü ve sınırlıdır. lib/google-sheets.ts dosyasında getAllServices(), getAllPersonnel(), addScore() gibi fonksiyonlar tanımlanmıştır. Ancak update ve delete operasyonları eksiktir. Service account credentials .env dosyasında tanımlanmamıştır (GOOGLE_SERVICE_ACCOUNT_EMAIL ve GOOGLE_PRIVATE_KEY boştur).

Google Sheets sheet yapısı şu şekilde planlanmıştır: DB_Planlama sheet'inde servis kayıtları tutulmaktadır. Personel_Listesi sheet'inde personel bilgileri bulunmaktadır. Puanlama sheet'inde servis puanları kaydedilmektedir. Aylik_Ozet sheet'inde aylık performans özetleri tutulmaktadır. DB_Logs sheet'inde tüm işlemler loglanmaktadır.

---

## 2. Google Sheets Veri Yapısı ve Two-Way Senkronizasyon

### 2.1 Sheet Yapısı ve Sütun Tanımları

**DB_Planlama Sheet'i** servis randevularını ve iş emirlerini içermektedir. Bu sheet'in sütun yapısı şu şekildedir: A sütunu ID (benzersiz kayıt tanımlayıcı), B sütunu Tarih (GG.AA.YYYY formatında), C sütunu Saat (HH:MM formatında), D sütunu Tekne Adı,E sütunu Adres/Lokasyon, F sütunu Marina/Tesis, G sütunu Servis Açıklaması, H sütunu İrtibat Kişisi, I sütunu Telefon, J sütunu Durum, K sütunu Kapanış Durumu, L sütunu Kapanış ID, M sütunu Kapanış Yapan, N sütunu Oluşturan, O sütunu Oluşturma Tarihi, P sütunu Güncelleme Tarihi, Q sütunu Silinmiş (TRUE/FALSE) şeklinde yapılandırılmıştır.

**Personel_Listesi Sheet'i** tüm teknik personel bilgilerini içermektedir. Sütunlar şu şekildedir: A sütunu ID, B sütunu Ad Soyad, C sütunu Unvan (Usta/Çırak/Yönetici/Ofis), D sütunu Rol (Teknisyen/Yetkili), E sütunu Aktif (TRUE/FALSE), F sütunu Giriş Yılı, G sütunu Telefon, H sütunu Email, I sütunu Adres, J sütunu Açıklama, K sütunu Oluşturma Tarihi, L sütunu Güncelleme Tarihi şeklinde düzenlenmiştir.

**Tekneler Sheet'i** müşteri tekne bilgilerini içermektedir. A sütunu ID, B sütunu Tekne Adı, C sütunu Seri No, D sütunu Marka, E sütunu Model, F sütunu Boyut (metre), G sütunu Motor Tipi, H sütunu Motor Seri No, I sütunu Yıl, J sütunu Renk, K sütunu Sahibi/Firma, L sütunu Adres, M sütunu Telefon, N sütunu Email, O sütunu Açıklama, P sütunu Aktif, Q sütunu Oluşturma Tarihi şeklinde yapılandırılmıştır.

**Puanlama Sheet'i** servis başına personel puanlarını içermektedir. A sütunu ID, B sütunu Servis ID, C sütunu Personel ID, D sütunu Personel Adı, E sütunu Rol (Sorumlu/Destek), F sütunu İş Türü, G sütunu Rapor Başarısı (0-1), H sütunu Ham Puan, I sütunu Zorluk Çarpanı, J sütunu Final Puan, K sütunu Bonus, L sütunu Notlar, M sütunu Tarih şeklinde düzenlenmiştir.

**Aylik_Ozet Sheet'i** aylık performans özetlerini içermektedir. A sütunu ID, B sütunu Personel ID, C sütunu Personel Adı, D sütunu Ay (YYYY-MM), E sütunu Servis Sayısı, F sütunu Sorumlu Servis, G sütunu Destek Servis, H sütunu Bireysel Puan Ortalaması, I sütunu Yetkili Puan Ortalaması, J sütunu İsmail Puanı, K sütunu Toplam Puan, L sütunu Sıralama, M sütunu Rozet (ALTIN/GÜMÜŞ/BRONZ) şeklinde yapılandırılmıştır.

### 2.2 Two-Way Senkronizasyon Mimarisi

Two-way senkronizasyon, Google Sheets ve PostgreSQL veritabanı arasında sürekli veri tutarlılığını sağlayan bir mekanizmadır. Bu mekanizma üç katmandan oluşmaktadır: Veri Çekme Katmanı (Pull Layer), Veri Gönderme Katmanı (Push Layer) ve Çakışma Çözüm Katmanı (Conflict Resolution Layer).

**Veri Çekme Katmanı** Google Sheets'teki değişiklikleri algılar ve PostgreSQL'e aktarır. Bu işlem cron job ile periyodik olarak veya webhook ile anlık olarak gerçekleştirilebilir. Her çekme işleminde lastSyncTimestamp kaydedilir ve sadece bu tarihten sonraki değişiklikler işlenir. Değişiklik takibi için ROW_NUMBER veya timestamp sütunları kullanılır.

**Veri Gönderme Katmanı** PostgreSQL'de yapılan değişiklikleri Google Sheets'e aktarır. Uygulama içinde yapılan her CREATE, UPDATE ve DELETE operasyonu sonrasında ilgili sheet'e yansıtılır. Webhook veya observable pattern ile değişiklikler yakalanır ve queue sistemi ile sıralı olarak işlenir.

**Çakışma Çözüm Katmanı** aynı kaydın hem Google Sheets hem de uygulamada değiştirilmesi durumunda devreye girer. Varsayılan strateji "last-write-wins" olup, en son yapılan değişiklik geçerli kabul edilir. Kritik veriler için "merge" stratejisi uygulanabilir. Değişiklik çakışmaları audit log'a kaydedilir.

### 2.3 Sync Mekanizması Teknik Implementasyonu

lib/sync/sync-manager.ts dosyasında sync mekanizması implement edilecektir. Bu dosya SyncClient sınıfını içerecektir. SyncClient constructor'ı Google Sheets client ve Prisma client alır. initialize() metodu sync tablosunu oluşturur veya migratesini yapar. syncFromSheets() metodu tüm sheet'leri okur ve veritabanı ile karşılaştırır. syncToSheets() metodu veritabanı değişikliklerini Sheets'e yansıtır. syncAll() metodu full sync başlatır.

lib/sync/sheet-sync.ts dosyası sheet bazlı sync fonksiyonlarını içerecektir. syncPlanlamaSheet() fonksiyonu servis kayıtlarını senkronize eder. syncPersonelSheet() fonksiyonu personel kayıtlarını senkronize eder. syncTeknelerSheet() fonksiyonu tekne kayıtlarını senkronize eder. syncPuanlamaSheet() fonksiyonu puan kayıtlarını senkronize eder.

lib/sync/change-detector.ts dosyası değişiklik algılama mantığını içerecektir. detectChanges() fonksiyonu iki veri kaynağı arasındaki farkları bulur. detectCreated() fonksiyonu yeni kayıtları tespit eder. detectUpdated() fonksiyonu güncellenen kayıtları tespit eder. detectDeleted() fonksiyonu silinen kayıtları tespit eder.

app/api/cron/sync/route.ts dosyası cron job endpoint'ini içerecektir. Bu endpoint CRON_SECRET ile korunacaktır. Güvenlik amacıyla sadece yetkili sunucular erişebilecektir. Manuel tetikleme için GET/POST desteği sağlayacaktır.

### 2.4 Cron Job ve Otomatik Senkronizasyon

Otomatik senkronizasyon için Vercel Cron Jobs veya external cron service kullanılabilir. Önerilen yapılandırma şu şekildedir: 15 dakikada bir incremental sync (sadece değişiklikler), saat başı full sync (tam karşılaştırma), günlük 03:00'da cleanup sync (silinen kayıtları işaretleme) şeklinde planlanmıştır.

vercel.json dosyasına eklenecek cron yapılandırması şu şekildedir:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync?type=incremental",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/sync?type=full",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/sync?type=cleanup",
      "schedule": "0 3 * * *"
    }
  ]
}
```

---

## 3. Modern UI Redesign Planı

### 3.1 Tasarım Felsefesi ve Prensipler

Modern UI tasarımı için Shadcn/ui ilhamlı, minimalist ve fonksiyonel bir yaklaşım benimsenecektir. Tasarım felsefesi kullanıcı deneyimini ön planda tutarak, karmaşık operasyonları basit ve anlaşılır arayüzlerle sunmayı hedeflemektedir. Görsel hiyerarşi net olacak, en önemli öğeler en belirgin şekilde konumlandırılacaktır. Dark mode varsayılan olacak, light mode opsiyonel olarak sunulacaktır.

Renk paleti profesyonel ve teknik bir görünüm sağlayacak şekilde belirlenmiştir. Primary rengi #0ea5e9 (sky blue) olacak, bu renk tüm aksiyon butonları ve vurgularda kullanılacaktır. Secondary rengi #334155 (slate) olacak, arka plan ve ikincil öğelerde kullanılacaktır. Success rengi #10b981 (emerald), warning rengi #f59e0b (amber), error rengi #ef4444 (red) olarak belirlenmiştir.

Tipografi için Inter font'u varsayılan olarak kullanılacaktır. Başlıklar için Bold ağırlık, gövde metinleri için Regular ağırlık kullanılacaktır. Responsive font size'lar mobile-first yaklaşımla belirlenecektir. Satır yüksekliği 1.6 olacak, okunabilirlik optimize edilecektir.

Spacing sistemi 4px tabanlı bir scale kullanacaktır. xs=4px, sm=8px, md=16px, lg=24px, xl=32px, 2xl=48px değerleri kullanılacaktır. Bu tutarlılık tüm arayüz bileşenlerinde uygulanacak, görsel harmony sağlanacaktır.

### 3.2 Component Library Yapısı

lib/components/ui/ klasöründe yeniden kullanılabilir bileşenler oluşturulacaktır. Bu bileşenler atomic design prensiplerine göre organize edilecek, her bileşen kendi dosyasında tanımlanacak ve index.ts dosyasından export edilecektir.

Button bileşeni primary, secondary, outline, ghost ve link varyantlarını destekleyecektir. Small, default, large ve icon boyutları olacaktır. Loading state ve disabled state'ler eklenecektir. AsChild desteği ile Radix UI slot component entegrasyonu sağlanacaktır.

Input bileşeni text, email, password, number ve search tiplerini kapsayacaktır. Error state ve error message desteği olacaktır. Helper text alanı eklenecektir. Label desteği ve left/right icon slot'ları bulunacaktır.

Card bileşeni Card, CardHeader, CardTitle, CardDescription, CardContent ve CardFooter sub-component'lerini içerecektir. Hover effect opsiyonel olarak eklenecektir. Clickable variant ile tıklanabilir kartlar oluşturulabilecektir.

Table bileşeni sortable columns, pagination ve selection özelliklerini barındıracaktır. Striped rows ve hover effects yapılandırılabilir olacaktır.

Modal (Dialog) bileşeni Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter sub-component'lerini içerecektir. Open/close state yönetimi, escape key ve outside click close özellikleri bulunacaktır.

Toast bileşeni provider, viewport, title, description, action ve close bileşenlerini içerecektir. Success, destructive, warning ve default variant'ları olacaktır. Auto-dismiss özelliği yapılandırılabilir olacaktır.

### 3.3 Tailwind CSS Configuration

tailwind.config.ts dosyası design system kurallarına göre güncellenecektir. Colors, borderRadius, boxShadow ve animations değerleri standartlaştırılacaktır. CSS variables globals.css'teki ile entegre edilecektir.

Renk yapılandırması şu şekilde olacaktır:

```typescript
colors: {
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  secondary: {
    // slate renkleri
  },
  destructive: {
    DEFAULT: '#ef4444',
    foreground: '#fafafa',
  },
  // ... diğer renkler
}
```

### 3.4 Layout ve Navigation Yeniden Tasarım

Mevcut Sidebar bileşeni tamamen yeniden tasarlanacaktır. Yeni tasarım responsive olacak, collapsible sidebar desteği sunacaktır. Mobile'da bottom navigation veya hamburger menu kullanılacaktır. Kullanıcı profil section'ı daha kapsamlı olacaktır.

Navigasyon yapısı şu şekilde yeniden organize edilecektir:

**Ana Sayfa (/)**: Dashboard, hızlı erişim widget'ları, son aktiviteler, istatistik kartları
**Servisler (/servisler)**: Servis listesi, filtreler, arama, yeni servis ekleme
**Tekneler (/tekneler)**: Tekne listesi, tekne detayları, yeni tekne ekleme
**Personel (/personel)**: Personel listesi, performans, değerlendirmeler
**Planlama (/planlama)**: Takvim görünümü, günlük planlama
**Puanlama (/puanlama)**: Marlin Yıldızı sistemi, aylık değerlendirmeler
**Raporlar (/raporlar)**: PDF/Excel raporları, WhatsApp raporları
**Ayarlar (/ayarlar)**: Sistem ayarları, kullanıcı yönetimi

Sidebar navigation item yapısı şu şekilde olacaktır:

```
├── ⚓ Ana Sayfa
├── 📋 Servisler
│   ├── Liste
│   ├── Takvim
│   └── Yeni Servis
├── ⚓ Tekneler
│   ├── Liste
│   └── Yeni Tekne
├── 👥 Personel
│   ├── Liste
│   ├── Performans
│   └── Değerlendirme
├── 📅 Planlama
├── ⭐ Puanlama
│   ├── Marlin Yıldızı
│   └── Geçmiş
├── 📊 Raporlar
│   ├── Servis Raporları
│   └── WhatsApp Rapor
└── ⚙️ Ayarlar
    ├── Genel
    ├── Kullanıcılar
    └── Entegrasyonlar
```

---

## 4. Yeni Sayfa Yapısı ve URL Mapping

### 4.1 Mevcut ve Yeni Sayfa Karşılaştırması

Mevcut sayfa yapısı (/planlama, /personel, /puanlama, /deger, /raporlar, /ayarlar) modern UI ve daha mantıksal organizasyon için yeniden yapılandırılacaktır.

| Mevcut URL | Yeni URL | Açıklama |
|------------|----------|----------|
| / | /dashboard | Dashboard ana sayfası |
| /planlama | /services | Servis listesi (eskiden planlama) |
| /planlama/yeni | /services/new | Yeni servis ekleme |
| /planlama/[id] | /services/[id] | Servis detay |
| /planlama/[id]/duzenle | /services/[id]/edit | Servis düzenleme |
| /personel | /boats | Tekne listesi |
| /personel/[id] | /boats/[id] | Tekne detay |
| /deger | /team/personnel | Personel listesi |
| /puanlama | /scoring | Puanlama ana sayfası |
| /puanlama/gecmis | /scoring/history | Geçmiş puanlar |
| /puanlama/rapor/[id] | /scoring/report/[id] | Puan raporu |
| /raporlar/whatsapp | /reports/whatsapp | WhatsApp rapor |
| /ayarlar | /settings | Ayarlar ana sayfası |
| /ayarlar/kullanicilar | /settings/users | Kullanıcı yönetimi |
| /ayarlar/tema | /settings/appearance | Tema ayarları |
| /ismail | /team/ismail-evaluation | Ismail değerlendirme |

### 4.2 Yeni Sayfa Detayları

**/dashboard** ana dashboard sayfası olacaktır. Hoş geldin mesajı ve kullanıcı adı gösterilecektir. İstatistik kartları (bugünkü servisler, aktif servisler, tamamlanan, bekleyen) görüntülenecektir. Hızlı erişim butonları (Yeni Servis, Tekne Ekle, Personel Ekle) bulunacaktır. Son aktiviteler feed'i ve durum dağılımı grafiği yer alacaktır. Günlük/Maftalık/yıllık trend göstergeleri olacaktır.

**/services** servis listesi sayfası olacaktır. Arama kutusu ile anlık filtreleme yapılabilecektir. Durum, konum, iş türü ve tarih filtreleri bulunacaktır. Tablo görünümü ve kart görünümü seçenekleri olacaktır. Pagination ve sayfa başına kayıt sayısı ayarı eklenecektir. Toplu işlem (toplu durum değişikliği) desteği sunulacaktır.

**/services/new** yeni servis ekleme formu olacaktır. Tekne seçimi (dropdown veya arama) yapılabilecektir. İş türü seçimi (Paket/Arıza/Proje) olacaktır. Tarih ve saat seçici bulunacaktır. Açıklama alanı olacaktır. Personel atama (multi-select) yapılabilecektir. Lokasyon seçimi ve irtibat bilgileri alanları olacaktır. Form validasyonu React Hook Form ve Zod ile sağlanacaktır.

**/services/[id]** servis detay sayfası olacaktır. Servis bilgileri kartı, tekne bilgileri, personel atamaları görüntülenecektir. Zaman çizelgesi (timeline) ile servis süreci gösterilecektir. Bekleyen parçalar listesi olacaktır. Kapanış raporu görüntüleme ve düzenleme yapılabilecektir. İşlem geçmişi (audit log) bulunacaktır. İlişkili servisler (aynı tekne için) gösterilecektir.

**/boats** tekne listesi sayfası olacaktır. Arama ve filtreleme (marka, boyut, aktif/pasif) yapılabilecektir. Kart görünümü ile tekne kartları görüntülenecektir. Toplam servis sayısı ve son servis tarihi gösterilecektir. Hızlı aksiyonlar (yeni servis ata) bulunacaktır.

**/boats/[id]** tekne detay sayfası olacaktır. Tekne bilgileri, teknik özellikler görüntülenecektir. Servis geçmişi (timeline veya liste) olacaktır. İrtibat bilgileri ve notlar bulunacaktır. Fotoğraf galerisi (varsa) gösterilecektir.

**/team/personnel** personel listesi sayfası olacaktır. Kart görünümü ile personel kartları görüntülenecektir. Rol ve unvan filtreleri olacaktır. Performans özeti (aylık puan, rozetler) gösterilecektir. Aktif/pasif filtreleme yapılabilecektir.

**/scoring** puanlama ana sayfası olacaktır. Bu ayın liderlik tablosu gösterilecektir. Rozet dağılımı grafiği olacaktır. Hızlı değerlendirme butonları bulunacaktır. Son değerlendirmeler feed'i yer alacaktır.

**/scoring/history** geçmiş puanlar sayfası olacaktır. Aylık performans tablosu görüntülenecektir. Yıllık klasman ve rozetler gösterilecektir. Karşılaştırma grafiği olacaktır. Export seçenekleri (PDF/Excel) bulunacaktır.

**/settings** ayarlar sayfası olacaktır. Genel ayarlar (firma bilgileri, varsayılanlar) yapılandırılabilecektir. Kullanıcı yönetimi (ekle, düzenle, sil) yapılabilecektir. Entegrasyonlar (Google Sheets ayarları) yönetilebilecektir. Appearance (tema, dil) ayarları yapılabilecektir.

---

## 5. Uygulama Planı ve Aşamalar

### 5.1 Aşama 1: Temel Altyapı (Hafta 1)

Bu aşamada UI Component Library oluşturulacaktır. Temel bileşenler (Button, Input, Textarea, Select, Checkbox, Radio, Switch, Badge, Card, Table, Modal, Toast, Loading, EmptyState, Avatar, Tabs, DropdownMenu) implement edilecektir. Tailwind config globals.css ile entegre edilecektir. TypeScript interfaces ve storybook comment'leri eklenecektir.

Bu aşamada ayrıca Two-way Sync mekanizması kurulacaktır. lib/sync/sync-manager.ts implement edilecektir. lib/sync/sheet-sync.ts implement edilecektir. lib/sync/change-detector.ts implement edilecektir. API endpoint'leri (/api/cron/sync) oluşturulacaktır. Google Sheets credentials yapılandırması tamamlanacaktır.

### 5.2 Aşama 2: Layout ve Navigation (Hafta 2)

Bu aşamada Sidebar bileşeni yeniden tasarlanacaktır. Responsive tasarım implement edilecektir. Collapsible özelliği eklenecektir. Kullanıcı profil section'ı geliştirilecektir. Mobile navigation (bottom nav veya hamburger) eklenecektir.

Bu aşamada Layout wrapper'lar da güncellenecektir. PageHeader bileşeni oluşturulacaktır. Breadcrumb navigation eklenecektir. PageContainer ile padding/margin standardizasyonu sağlanacaktır. Scroll to top behavior implement edilecektir.

### 5.3 Aşama 3: Dashboard ve Servisler (Hafta 3-4)

Bu aşamada Dashboard (/dashboard) yeniden tasarlanacaktır. Yeni stat card bileşenleri kullanılacaktır. Chart entegrasyonu (Recharts veya Chart.js) yapılacaktır. Son aktiviteler feed'i geliştirilecektir. Quick actions widget'ı oluşturulacaktır.

Bu aşamada Servis sayfaları da yeniden tasarlanacaktır. /services (liste) sayfası yeni tasarımla oluşturulacaktır. /services/new (yeni servis) formu implement edilecektir. /services/[id] (detay) sayfası tamamlanacaktır. Filtreleme ve arama fonksiyonları geliştirilecektir.

### 5.4 Aşama 4: Tekneler ve Personel (Hafta 5-6)

Bu aşamada Tekne yönetimi oluşturulacaktır. /boats (liste) sayfası implement edilecektir. /boats/[id] (detay) sayfası oluşturulacaktır. Servis geçmişi görüntüleme yapılacaktır. Google Sheets import/export entegrasyonu tamamlanacaktır.

Bu aşamada Personel yönetimi de güncellenecektir. /team/personnel (liste) sayfası yeniden tasarlanacaktır. Personel detay sayfaları (performans, değerlendirmeler) oluşturulacaktır. Rozet ve liderlik tablosu gösterimi yapılacaktır.

### 5.5 Aşama 5: Puanlama ve Raporlar (Hafta 7-8)

Bu aşamada Puanlama sistemi tamamlanacaktır. /scoring (ana sayfa) yeniden tasarlanacaktır. /scoring/history (geçmiş) sayfası oluşturulacaktır. Yetkili değerlendirme formları implement edilecektir. Ismail değerlendirme formu oluşturulacaktır. Otomatik puan hesaplama ve rozet atama mantığı tamamlanacaktır.

Bu aşamada Raporlama da geliştirilecektir. /reports/whatsapp sayfası yeniden tasarlanacaktır. PDF export fonksiyonları eklenecektir. Excel export fonksiyonları eklenecektir. Custom rapor oluşturma (tarih aralığı, filtreler) yapılabilecektir.

### 5.6 Aşama 6: Ayarlar ve Final (Hafta 9-10)

Bu aşamada Ayarlar sayfası tamamlanacaktır. /settings (ana sayfa) oluşturulacaktır. /settings/users (kullanıcı yönetimi) implement edilecektir. /settings/appearance (tema) ayarları eklenecektir. /settings/integrations (Google Sheets) yapılandırması tamamlanacaktır.

Bu aşamada Test ve Deployment de yapılacaktır. Unit test'ler yazılacaktır. Integration test'ler yapılacaktır. E2E test'ler (Playwright) oluşturulacaktır. Performance optimizasyonu yapılacaktır. Production deployment gerçekleştirilecektir.

---

## 6. Google Sheets Two-Way Senkronizasyon Claude Code Promptu

Aşağıdaki prompt'u Claude Code'da kullanarak two-way sync mekanizmasını oluşturabilirsiniz:

```
Marlin Yatçılık ServicePro projesi için kapsamlı Google Sheets two-way senkronizasyon sistemi oluştur.

PROJE BAĞLAMI:
- Next.js 14 App Router
- TypeScript strict mode
- Prisma ORM v6.19.2
- PostgreSQL (Neon)
- Mevcut lib/google-sheets.ts var (tek yönlü read)
- .env'de GOOGLE_SERVICE_ACCOUNT_EMAIL ve GOOGLE_PRIVATE_KEY tanımlanacak

SHEET YAPISI:
1. DB_Planlama: ID, Tarih, Saat, TekneAdi, Adres, Yer, ServisAciklamasi, IrtibatKisi, Telefon, Durum, KapanisDurumu, KapanisId, KapanisYapan, Olusturan, OlusturmaTarihi, GuncellestirmeTarihi, Silinmis
2. Personel_Listesi: ID, Ad, Unvan, Rol, Aktif, GirisYili, Telefon, Email, Adres, Aciklama, OlusturmaTarihi, GuncellestirmeTarihi
3. Tekneler: ID, TekneAdi, SeriNo, Marka, Model, Boyut, MotorTipi, MotorSeriNo, Yil, Renk, Sahibi, Adres, Telefon, Email, Aciklama, Aktif, OlusturmaTarihi
4. Puanlama: ID, ServisID, PersonelID, PersonelAdi, Rol, IsTuru, RaporBasarisi, HamPuan, ZorlukCarpani, FinalPuan, Bonus, Notlar, Tarih
5. Aylik_Ozet: ID, PersonelID, PersonelAdi, Ay, ServisSayisi, SorumluServis, DestekServis, BireyselPuanOrt, YetkiliPuanOrt, IsmailPuani, ToplamPuan, Siralama, Rozet

YAPILACAK İŞLER:

1. lib/sync/ konusu oluştur

2. lib/sync/types.ts:
   - SheetConfig interface: sheet name, range, primaryKey, columns, syncStrategy
   - SyncResult interface: success, created, updated, deleted, errors, timestamp
   - ChangeRecord interface: type (CREATE/UPDATE/DELETE), before, after, timestamp

3. lib/sync/sheet-sync.ts:
   - getSheetData(sheetName, range) fonksiyonu
   - getAllSheetData() fonksiyonu - tüm sheet'leri oku
   - updateSheetRow(sheetName, primaryKey, data) fonksiyonu
   - appendSheetRow(sheetName, data) fonksiyonu
   - deleteSheetRow(sheetName, primaryKey) fonksiyonu - soft delete (Silinmis=TRUE)

4. lib/sync/db-sync.ts:
   - getDbRecords(model) fonksiyonu
   - createDbRecord(model, data) fonksiyonu
   - updateDbRecord(model, id, data) fonksiyonu
   - softDeleteDbRecord(model, id) fonksiyonu

5. lib/sync/change-detector.ts:
   - detectChanges(dbData, sheetData, primaryKey) fonksiyonu
   - detectCreated(db, sheet) fonksiyonu
   - detectUpdated(db, sheet) fonksiyonu
   - detectDeleted(db, sheet) fonksiyonu

6. lib/sync/sync-manager.ts:
   - SyncManager class:
     * constructor(prisma, sheets)
     * async syncFromSheets(sheetName) - Sheets'den DB'ye
     * async syncToSheets(sheetName) - DB'den Sheets'e
     * async syncAll() - tüm sheet'ler
     * async syncIncremental() - sadece değişiklikler
     * getLastSync(sheetName) - son sync zamanı
     * setLastSync(sheetName, timestamp) - sync zamanı kaydet
     * async validateConnection() - bağlantı kontrolü

7. lib/sync/prisma-sync-log.ts (model):
   - id, sheetName, syncType, status, recordsCreated, recordsUpdated, recordsDeleted, errorMessage, duration, createdAt

8. app/api/sync/route.ts:
   - GET: Son sync durumunu getir
   - POST: Manual sync başlat (type=full|incremental|specific)
   - Body: { type, sheetName?, forceFull }

9. app/api/cron/sync/route.ts:
   - GET/POST: CRON_SECRET ile korumalı
   - Query: type=full|incremental|cleanup
   - Background job başlat

10. prisma/schema.prisma'ya SyncLog modeli ekle:
    model SyncLog {
      id String @id @default(cuid())
      sheetName String
      syncType String // FULL, INCREMENTAL, CLEANUP
      status String // SUCCESS, FAILED, PARTIAL
      recordsCreated Int @default(0)
      recordsUpdated Int @default(0)
      recordsDeleted Int @default(0)
      errorMessage String?
      durationMs Int?
      createdAt DateTime @default(now())
    }

11. .env.example güncelle:
    # Google Sheets Service Account (Two-way sync için gereklidir)
    GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
    GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
    GOOGLE_SHEETS_ID="1IGa23ZXugvCGblp4GtE2Tl06Z2mnZ2VxIM_F6vyolVs"
    CRON_SECRET="secure-random-string-for-cron-jobs"

12. lib/google-sheets.ts güncelle:
    - Mevcut fonksiyonları lib/sync/sheet-sync.ts'e taşı
    - Sheet name constants export et

ÖNEMLİ KURALLAR:
- DB öncelikli senkronizasyon (DB master, Sheets secondary)
- Soft delete kullan (Silinmis=TRUE)
- Timestamps (OlusturmaTarihi, GuncellestirmeTarihi) otomatik güncelle
- Change detection için updatedAt kullan
- Error handling: try-catch, logging, retry logic
- Rate limiting: Google Sheets API rate limit'e dikkat
- Logging: her sync işlemini SyncLog'a kaydet

TÜM DOSYALAR İÇİN:
- TypeScript interfaces
- JSDoc comments
- Error handling
- Logging
- Unit test'ler (varsa)

Önce mevcut dosyaları oku, sonra yukarıdaki dosyaları oluştur.
```

---

## 7. Modern UI Component Library Claude Code Promptu

Aşağıdaki prompt'u kullanarak UI Component Library oluşturabilirsiniz:

```
Marlin Yatçılık ServicePro projesi için Modern UI Component Library oluştur.

PROJE BAĞLAMI:
- Next.js 14 App Router
- TypeScript strict mode
- Tailwind CSS v3.x
- Dark mode destekli
- Mevcut globals.css'te CSS variables var
- Shadcn/ui ilhamlı, minimalist design

COMPONENT LİSTESİ (lib/components/ui/):

1. Button.tsx
   - Variants: default, destructive, outline, secondary, ghost, link
   - Sizes: default, sm, lg, icon
   - Loading state, disabled state
   - AsChild desteği (Radix UI slot)

2. Input.tsx
   - Types: text, email, password, number, search
   - Error state ve error message
   - Helper text, label desteği
   - Left/Right icon slot

3. Textarea.tsx
   - rows prop, resize kontrolü
   - Character count

4. Select.tsx
   - Native ve custom select
   - Grouped options, disabled options
   - Search/filter desteği

5. Checkbox.tsx
   - Label desteği, indeterminate state

6. RadioGroup.tsx
   - Orientation: vertical/horizontal
   - Label desteği

7. Switch.tsx
   - Label desteği, loading state

8. Badge.tsx
   - Variants: default, secondary, outline, destructive
   - Custom color support

9. Card.tsx
   - Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
   - Hover effect, clickable variant

10. Table.tsx
    - Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption
    - Sortable columns, pagination, selection

11. Dialog.tsx
    - Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
    - Open/close state, escape key, outside click close

12. Toast.tsx
    - ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastAction, ToastClose
    - Variants: default, success, destructive, warning
    - Auto-dismiss (varsayılan 5000ms)

13. Loading.tsx
    - Spinner (sm, md, lg)
    - Skeleton (width, height, borderRadius)

14. EmptyState.tsx
    - Icon, title, description, action button

15. Avatar.tsx
    - Image fallback, initials fallback
    - Sizes: sm, md, lg, xl

16. Tabs.tsx
    - Tabs, TabsList, TabsTrigger, TabsContent

17. DropdownMenu.tsx
    - DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator

STİL KURALLARI:
- CSS variables kullan (globals.css'teki ile uyumlu)
- Dark mode: dark: prefix'i
- Focus ring ve accessibility
- Mobile-first responsive
- Tutarlı spacing (4px grid)

TÜM COMPONENTS İÇİN:
- TypeScript interfaces (Props tipleri)
- JSDoc comments
- Accessibility (aria-* attributes)
- Export: lib/components/ui/index.ts

TAILWIND CONFIG GÜNCELLEME:
- colors: primary, secondary, destructive, warning, success, muted, accent
- borderRadius: sm, md, lg, xl, full
- Extend yerine override kullanma

Önce globals.css ve tailwind.config.ts'i oku, sonra component'leri oluştur.
```

---

## 8. Sonraki Adımlar ve Öneriler

### 8.1 Acil Yapılması Gerekenler

İlk olarak Google Sheets credentials'ları almanız gerekmektedir. Google Cloud Console'dan service account oluşturmanız ve JSON key indirmeniz gerekmektedir. Bu key bilgilerini .env dosyasına eklemelisiniz. Sonrasında iki-way sync mekanizmasını kurabilirsiniz.

İkinci olarak UI Component Library oluşturmanız önerilmektedir. Bu, frontend geliştirmeyi dramatik şekilde hızlandıracaktır. Tutarlı bir design system sağlayacaktır. Bakım ve güncelleme maliyetini düşürecektir.

Üçüncü olarak kritik sayfaları (Dashboard, Servisler, Tekneler) önceliklendirmeniz önerilmektedir. Bu sayfalar günlük kullanımda en çok kullanılan sayfalardır. Kullanıcı deneyimini doğrudan etkilerler.

### 8.2 Uzun Vadeli Hedefler

Production deployment için Vercel veya benzeri bir platform kullanmanız önerilmektedir. CI/CD pipeline kurmanız faydalı olacaktır. Monitoring ve logging entegrasyonu yapmanız önerilmektedir.

Mobil uygulama geliştirme düşünülebilir. PWA (Progressive Web App) olarak başlayabilirsiniz. React Native ile native app yapabilirsiniz.

Entegrasyon genişletme düşünülebilir. WhatsApp API ile rapor gönderimi yapılabilir. Email notification sistemi kurulabilir. SMS entegrasyonu eklenebilir.

---

## 9. Teknik Notlar ve Referanslar

### 9.1 Environment Variables

Deployment öncesinde .env dosyasındaki tüm credentials'ları güncellemeniz gerekmektedir. JWT_SECRET güçlü bir random string olmalıdır. DATABASE_URL Neon dashboard'dan alınmalıdır. Google credentials service account JSON'dan alınmalıdır. CRON_SECRET güçlü random string olmalıdır.

### 9.2 Bağımlılıklar

Mevcut package.json'a eklenmesi gereken bağımlılıklar şunlardır: @radix-ui/react-dialog (modal), @radix-ui/react-dropdown-menu, @radix-ui/react-tabs, @radix-ui/react-toast, @radix-ui/react-avatar, @radix-ui/react-checkbox, @radix-ui/react-select, @radix-ui/react-switch, lucide-react (ikonlar), recharts (grafikler), clsx ve tailwind-merge (class helper'ları).

### 9.3 Veritabanı Migration

Sync mekanizmasını kurmadan önce Prisma migration çalıştırmanız gerekmektedir. SyncLog modeli eklenecektir. Bazı enum değerleri Google Sheets ile uyumlu hale getirilecektir.

---

Bu doküman ServicePro projesinin kapsamlı bir yeniden yapılandırma planını sunmaktadır. Two-way sync mekanizması ile Google Sheets ve uygulama arasında veri tutarlılığı sağlanacaktır. Modern UI redesign ile kullanıcı deneyimi önemli ölçüde iyileştirilecektir. Yeni sayfa yapısı ile navigasyon daha mantıksal ve kullanıcı dostu olacaktır.

Planın uygulanması yaklaşık 10 hafta sürecektir. Her aşamada test ve deployment yapılacaktır. Kritik yol üzerindeki özellikler (Dashboard, Servisler, Two-way sync) önceliklendirilmiştir.
