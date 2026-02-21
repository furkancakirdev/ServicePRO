# ServicePRO — Ant Design ProComponents ile UI vNext (Office-first)
> Bu doküman, **tam UI değişimi** kararını baz alarak ServicePRO’nun arayüzünü **Ant Design + ProComponents** (ProLayout, ProTable, ProForm) ile yeniden kurmak için **status + strateji + uygulanabilir implement planı** sunar.  
> Kararlar (kesin):  
> - **Terminoloji:** Lead → **Talep**  
> - **Tek planlama ekranı:** `/takvim` (default **Gün**, Hafta opsiyon)  
> - **Planlama sadece tarih:** teknisyen ataması **Job detaydan**  
> - **Calls/Booking yok:** direkt **Talep** açılır  
> - **Pricebook + Templates UI kaldırılacak:** **DB’ye dokunulmayacak**  
> - **Sol sidebar yok:** **Top navigation + Yönetim dropdown**  
> - **%100 Türkçe**: tüm metinler ve tüm karakterler (İ/ı/Ğ/ğ/Ş/ş/Ç/ç/Ö/ö/Ü/ü) eksiksiz

---

## 1) Neden Ant Design ProComponents?
Office-first servis yönetimi ürünleri (ServiceTitan tipi) “enterprise” desenine yaslanır: üst navigasyon, yoğun tablolar, güçlü formlar, filtre/saved views. ProComponents bu katmanı hazır getirir:
- **ProLayout:** enterprise layout, otomatik menu üretimi, top layout desteği. citeturn0search0turn0search1  
- **ProTable:** filtre/arama/toolbar/kolon şeması gibi ortak ihtiyaçları hızlandırır. citeturn0search6  
- **Next.js App Router + antd:** SSR/FOUC (style flash) sorununu azaltmak için `@ant-design/nextjs-registry` önerilir. citeturn0search2  

> Not: Ant Design’e geçmek “layout ve yoğun ekran ergonomisi” problemini hızlı çözer; ancak taşma/fit sorunlarının kalıcı çözümü yine **layout kuralları** ve doğru `scroll/min-width` ayarlarıdır (bu planın içinde var).

---

## 2) Hedef Ürün Akışı (Office-first)
**Talep → İş Emri → Planlama (tarih) → Kapanış**
1) **Talepler (Talep)**: hızlı kayıt + takip tarihi + durum  
2) **İş Emirleri**: talebi iş emrine dönüştür + iş emri yönetimi  
3) **Planlama (Takvim)**: planlanmamış işleri gün hücresine bırak → sadece **tarih** set et  
4) **İş Emri Detay**: atama (teknisyen), blokaj, kapanış, timeline/audit  
5) **Operasyon**: dashboard = bugün + risk + blokaj + iş yükü  
6) **Yönetim**: tekneler, personel, ayarlar (sözlükler+entegrasyon+güvenlik)

---

## 3) Yeni Bilgi Mimarisi (Navigation vNext)
### 3.1 Top Navigation (layout=top)
Ana menü (üstte):
- **Operasyon**
- **İş Emirleri**
- **Planlama**
- **Talepler**
- **Raporlar** (opsiyon; sprint sonrası)

Yönetim dropdown:
- **Tekneler**
- **Personel**
- **Ayarlar**

Sağ üst:
- Global arama (Tekne/İş/Talep)
- “Yeni” (Talep / İş Emri)
- Bildirim zili
- Kullanıcı menüsü

**Menu şişmesini önleme kuralı:** Menüye yalnız “günlük iş” sokulur. Yönetim öğeleri dropdown’da kalır.

---

## 4) Teknik Strateji: shadcn/ui → Ant Design ProComponents geçişi
### 4.1 Paket stratejisi (aşamalı geçiş)
- **Aşama-1:** ProLayout ile yeni top-nav iskeletini kur (mevcut sayfaları içine göm).  
- **Aşama-2:** Çekirdek sayfaları ProTable/ProForm’a çevir (Talepler, İş Emirleri, Takvim).  
- **Aşama-3:** Eski shadcn ekranlarını kaldır/redirect et (Calls, Dispatch, Pricebook, Templates, eski Ayarlar).

Bu sayede tek PR’da büyük kırılma olmaz.

### 4.2 Next.js App Router + antd SSR (flicker önleme)
Ant Design dokümanı, App Router’da ilk ekran stil “flash”ini azaltmak için `@ant-design/nextjs-registry` kullanımını önerir. citeturn0search2  
Bu kurulumu **app/layout.tsx** içine alacağız.

### 4.3 Türkçe locale (Ant Design + ProComponents)
- `ConfigProvider locale={trTR}` (Ant Design TR locale)
- ProComponents bileşenlerinde “built-in” textler (örn tablo boş metinleri) TR’ye çevrilir.
- Bizim domain string’ler (Talep, İş Emri, Planlama…) zaten “custom labels”.

> Ayrıca **toLocaleUpperCase('tr-TR')** kullanımı zorunlu: “i/İ” hatasını bitirir.

### 4.4 Fit/Overflow standartları (kalıcı çözüm)
- Layout ana içerik alanı: `min-width: 0` (flex taşmasını engeller)
- ProTable: `scroll={{ x: 'max-content' }}` + container `overflow:auto`
- Sayfa container: max width yerine “fluid” (office ekranı geniş kullanmalı)
- “Card inside card” ve glassmorphism azaltılır (sade enterprise yüzey)

---

## 5) Route Konsolidasyonu (temizlik)
**Tek gerçek sayfalar:**
- `/operasyon`
- `/is-emirleri`
- `/takvim`
- `/talepler`
- `/tekneler`
- `/personel`
- `/ayarlar`

**Redirect / kaldır:**
- `/dispatch` → `/takvim`
- `/calls` kaldır → `/talepler?source=telefon`
- `/pricebook` ve `/templates/*` kaldır → 404 veya `/ayarlar` içinde “Devre dışı”
- `/jobs` ve `/servisler` → `/is-emirleri` (canonical)

---

## 6) Ayarlar v2 (sıfırdan)
Ayarlar tek sayfa değil: ProComponents ile **tabs** ya da **left-submenu** (Ayarlar içinde) kullanılır.

1) **Genel**
- Firma adı/logo
- Varsayılan lokasyon
- Saat dilimi: Europe/Istanbul
- Tarih formatı (TR)

2) **Sözlükler**
- Lokasyonlar
- İş durumu etiketleri (TR ad + renk)
- Blokaj nedenleri
- İş türleri/kategoriler

3) **Entegrasyonlar**
- Google Sheets: aktif/pasif, sheet seçimi, son sync, hata logları

4) **Güvenlik & Kullanıcılar**
- Kullanıcı rolleri
- Whitelist (varsa)
- Audit log viewer (opsiyon)

> Alert rules / notifications ayarları burada olacak (ayrı sayfa kalabalığı olmayacak).

---

## 7) %100 Türkçe — Debug ve Kalıcı Denetim
### 7.1 Kural: UI metni merkezi sözlükten
- `src/i18n/tr.ts` (basit key-value)
- `t(key)` helper
- UI’da hardcoded string yok.

### 7.2 Otomatik denetim script’i (CI’de fail)
`scripts/check-tr-ui.ts`:
- İngilizce blacklist: Today, Technician, Queue, Jobs, Dispatch, Calls, Leads, Pricebook, Template, Notification, Alert, Comfortable, Compact…
- ASCII Türkçe pattern’leri: Gun, Is, Planlanmamis, Tum, Aciklama, Donustur, Yukle…
- BOM tespiti: `\ufeff` var mı?

Fail kriterleri:
- `/app`, `/components`, `/src` altında blacklist ya da ASCII TR pattern’i bulunursa build fail.

### 7.3 Karakter kontrolü (detaylı)
- UI render edilen tüm label’lar için “snapshot” test (Playwright) + regex:
  - `İ|ı|Ğ|ğ|Ş|ş|Ç|ç|Ö|ö|Ü|ü` karakterleri beklenen metinlerde var mı?
- Tarih formatı TR: `DD MMM YYYY` gibi; fakat string manipülasyonlar TR locale ile.

---

## 8) Implement Plan (Sprint bazlı, Codex için net)
> Önce “yeni layout + route konsolidasyonu” ile UI iskeletini kur, sonra sayfaları tek tek ProComponents’a çevir.

### Sprint 0 — Kurulum + Layout İskeleti (P0)
**0.1 Paket ve SSR kurulumu**
- `antd`, `@ant-design/pro-components`, `@ant-design/nextjs-registry` (App Router için) citeturn0search2  
- `app/layout.tsx` içinde AntdRegistry wrap

**0.2 ProLayout ile TopNav**
- `components/layout/AppShell.tsx`:
  - `ProLayout layout="top"` (top nav)
  - Menü config: Operasyon/İş Emirleri/Planlama/Talepler/Raporlar
  - Yönetim dropdown: Tekneler/Personel/Ayarlar
- Mevcut sayfaları children olarak render

**0.3 Global style / fit**
- Content area: `minWidth: 0`
- ProLayout `contentStyle` → `padding: 0` (PageContainer yönetsin)
- Tablolar için global `overflow: auto`

**Acceptance**
- Sol sidebar yok, top nav var
- Eski sayfalar yeni layout içinde açılıyor
- İlk ekran “style flicker” minimal

---

### Sprint 1 — Route Temizliği + Menü Sadeleşmesi (P0)
**1.1 Canonical routes**
- `/operasyon`, `/is-emirleri`, `/takvim`, `/talepler`, `/tekneler`, `/personel`, `/ayarlar`

**1.2 Redirect/disable**
- `/dispatch` → `/takvim`
- `/calls` → `/talepler?source=telefon`
- `/pricebook` ve `/templates/*` → 404/redirect (UI tamamen kaldır; DB dokunma)

**Acceptance**
- Menü sadece 4–5 ana bölüm + yönetim dropdown
- Duplicate sayfalar user’a görünmüyor

---

### Sprint 2 — Talepler (Talep) v2 — ProTable + ProForm (P0)
**2.1 Talep listesi**
- ProTable ile:
  - arama, status filtre, owner filtre
  - URL searchParams persist
  - row density (compact default)

**2.2 Yeni Talep (DrawerForm/ModalForm)**
- Minimum alan: konu/özet, tekne opsiyon, lokasyon, kaynak, takip tarihi

**2.3 Talep → İş Emrine Dönüştür**
- “Dönüştür” aksiyonu job create endpoint çağırır
- Dönüşüm sonrası Job detayına yönlendir

**Acceptance**
- Calls yok: talep akışı tek başına yeter
- Tüm metinler Türkçe

---

### Sprint 3 — İş Emirleri v2 — ProTable + Detail sayfası (P0)
**3.1 İş emri listesi**
- ProTable: status/öncelik/lokasyon filtre
- saved views (ProTable toolbar custom)

**3.2 İş Emri Detay**
- PageContainer + Tabs:
  - Genel
  - Planlama (tarih bilgisi)
  - Notlar
  - Geçmiş (audit)
- Atama modal (teknisyen) **burada**
- Blokaj modal (neden + not)
- Kapanış modal (özet)

**Acceptance**
- Atama takvimde yok; job detayda var
- Timeline/audit net

---

### Sprint 4 — Takvim v2 (Gün bazlı) (P0)
**4.1 Takvim grid sadeleştirme**
- Mevcut dispatch board’daki “resource/teknisyen lane” kaldır
- Tek lane (Planlı İşler) + gün hücreleri
- Drag-drop: sadece job’un `plannedDate` alanını set eder (personel yok)
- View: day default, week opsiyon

**4.2 Fit/scroll**
- X overflow kontrollü
- Kartlar sabit max width, text clamp

**Acceptance**
- Planlama sadece tarih
- Taşma yok / kontrollü scroll var
- Gün default

---

### Sprint 5 — Ayarlar v2 (P1)
**5.1 Yeni IA**
- ProCard + Tabs: Genel / Sözlükler / Entegrasyonlar / Güvenlik
- Eski `/ayarlar` sayfası sil

**5.2 Sözlük ekranları**
- Lokasyonlar
- Blokaj nedenleri
- Durum etiketleri

**Acceptance**
- Ayarlar sade ve güncel süreçleri besliyor

---

### Sprint 6 — %100 Türkçe Denetim + Temizlik (P0, paralel)
- `scripts/check-tr-ui.ts` + CI fail
- BOM temizliği
- ASCII TR düzeltmeleri
- `toLocaleUpperCase('tr-TR')` düzeltmeleri

**Acceptance**
- UI’da İngilizce yok
- TR karakterler tam

---

## 9) ProComponents bileşen eşleştirme (hangi sayfa ne ile yapılacak)
- **Layout:** ProLayout + PageContainer citeturn0search0  
- **Listeler:** ProTable citeturn0search6  
- **Formlar:** ProForm, ModalForm, DrawerForm (Talep oluştur, Atama/Blokaj/Kapanış) citeturn0search4  
- **Detay:** ProDescriptions (Job meta)  
- **Kart:** ProCard (Dashboard blokları)  
- **Bildirim:** Antd notification + custom drawer (topbar)

---

## 10) Codex Başlangıç Promptu (tek mesaj, doğrudan uygula)
```text
Repo: ServicePRO. UI vNext'i Ant Design ProComponents ile yeniden inşa et.

Hedefler:
1) Sol sidebarı kaldır; ProLayout ile top navigation + yönetim dropdown kur (Operasyon, İş Emirleri, Planlama, Talepler, Raporlar; Yönetim: Tekneler, Personel, Ayarlar).
2) Next.js App Router + antd SSR için @ant-design/nextjs-registry ile registry kur (ant docs).
3) Route temizlik: /dispatch -> /takvim redirect; /calls kaldır (talep yeter); /pricebook ve /templates UI’dan tamamen kaldır (DB’ye dokunma); /jobs ve /servisler -> /is-emirleri canonical.
4) Takvim: mevcut board’u koru ama “teknisyen bazlı lane” kaldır; planlama sadece tarih; default Gün, Hafta opsiyon. Drag-drop sadece planned date set etsin. Atama Job detaydan.
5) Terminoloji: Lead -> Talep. Tüm UI %100 Türkçe (diakritikler dahil). İngilizce kelime kalmayacak.
6) Ayarlar sayfasını tamamen sil ve Ayarlar v2 kur: Genel, Sözlükler, Entegrasyonlar(Sheets), Güvenlik&Kullanıcılar.
7) Taşma/fit sorunlarını düzelt: min-w-0, overflow, ProTable scroll, fluid container.
8) Otomatik denetim ekle: scripts/check-tr-ui.ts (BOM + İngilizce blacklist + ASCII Türkçe tespiti). CI’da fail ettir.

Sıra: Sprint0 (kurulum+layout) -> Sprint1 (routes) -> Sprint2 (talepler) -> Sprint3 (iş emirleri) -> Sprint4 (takvim) -> Sprint5 (ayarlar). Türkçe denetimi paralel.
Her sprint sonunda build geçsin, ana sayfalar açılabilsin.
```

---

## 11) Kaynaklar
- ProLayout (ProComponents): citeturn0search0  
- ProTable (ProComponents): citeturn0search6  
- ProComponents docs/intro: citeturn0search1turn0search4  
- Ant Design + Next.js App Router registry önerisi: citeturn0search2  
