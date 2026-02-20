# Codex UI/UX Düzenleme Prompt

## TANIM
ServicePro ERP uygulamasında görsel ve yapısal UI/UX sorunlarını düzelt. Kullanıcı şikayeti: "sayfalar çok karmaşık, düzenler karışık, her yerde birşeyler yazıyor, sığmayan butonlar, sidebarla sayfa renk uyumsuzlukları, gereksiz açıklamalar var."

## KAPSAM
Sadece **GÖRSEL ve YAPISAL düzeltmeler** - yeni özellik ekleme. Test-first yaklaşım: Her değişiklikten önce Playwright testi yaz.

## TESPİT EDİLEN SORUNLAR VE ÇÖZÜMLER

### 1. RENK UYUMSUZLUKLARI 🎨

#### 1.1 Sidebar vs Ana İçerik Renk Farkı
**Sorun:** Sidebar arka planı (#f8f9fa) ile ana içerik (white) arasında gereksiz kontrast
**Dosya:** `components/Sidebar.tsx`, `app/globals.css`
**Çözüm:**
```css
/* app/globals.css - .main-content class'ına ekle */
.main-content {
  background-color: #f8f9fa;
  min-height: 100vh;
}
```

#### 1.2 Aktif Buton Renkleri Inconsistent
**Sorun:** Aktif buton mavi tonları tutarsız
**Dosya:** `components/Sidebar.tsx` (satır 150-180 civarı)
**Çözüm:** Tüm active state'ler için `rgb(59, 130, 246)` veya `bg-blue-500` standartı kullan

**TEST:**
```typescript
// e2e/ui/color-consistency.spec.ts
test('sidebar ve ana içerik renk uyumlu olmalı', async ({ page }) => {
  const sidebarBg = await page.locator('.sidebar').evaluate(el =>
    getComputedStyle(el).backgroundColor
  );
  const mainBg = await page.locator('main').evaluate(el =>
    getComputedStyle(el).backgroundColor
  );
  // Renkler uyumlu olmalı (çok keskin kontrast yok)
});
```

---

### 2. SIĞMAYAN BUTONLAR (OVERFLOW) 📐

#### 2.1 QuickActions Responsive Düzeni
**Sorun:** Mobilde butonlar sıkışıyor, taşma oluyor
**Dosya:** `components/QuickActions.tsx`
**Çözüm:**
```tsx
// Mevcut statik yerine responsive grid kullan
<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
  {/* Butonlar buraya */}
</div>
```

#### 2.2 Tablo Aksiyon Butonları
**Sorun:** Mobilde tıklama alanları çok küçük
**Dosya:** `components/services/data-table.tsx`
**Çözüm:**
```tsx
// Dropdown trigger butonlarına
className="h-9 w-9 flex items-center justify-center"  // Min 36px
// veya
className="h-11 px-4"  // Min 44px (touch friendly)
```

**TEST:**
```typescript
// e2e/ui/touch-targets.spec.ts
test('butonlar minimum 44px tıklama alanına sahip olmalı', async ({ page }) => {
  const buttons = page.locator('button, a[role="button"]');
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const box = await buttons.nth(i).boundingBox();
    if (box) {
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(36);
    }
  }
});
```

---

### 3. KARMAŞIK LAYOUT'LAR 📋

#### 3.1 Ana Sayfa Bileşen Yığını
**Sorun:** `app/page.tsx` çok fazla bileşen, hiyerarşi yok, birbirine yapışık
**Dosya:** `app/page.tsx`
**Çözüm:**
```tsx
// Bölümleri card'larla ayır, spacing ekle
<main className="p-6 space-y-6">
  <section className="bg-white rounded-lg shadow p-6">
    {/* İçerik */}
  </section>
  <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {/* Kartlar */}
  </section>
</main>
```

#### 3.2 Ayarlar Sayfası Responsive Grid
**Sorun:** `app/ayarlar/page.tsx` grid'i responsive değil (md breakpoint eksik)
**Dosya:** `app/ayarlar/page.tsx` (satır 30-60 civarı)
**Çözüm:**
```tsx
// Eski: grid-cols-1 lg:grid-cols-3
// Yeni:
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```

**TEST:**
```typescript
// e2e/ui/responsive-layout.spec.ts
test('sayfalar mobilde taşma olmamalı', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 }); // iPhone
  await page.goto('/servisler');

  const bodyWidth = await page.locator('body').evaluate(el => el.scrollWidth);
  const viewportWidth = await page.viewportSize().width;

  expect(bodyWidth).toBe(viewportWidth); // Horizontal scroll yok
});
```

---

### 4. GEREKSIZ AÇIKLAMALAR 📝

#### 4.1 Sidebar Menü Metinleri
**Sorun:** Menü item'larında gereksiz uzun metinler
**Dosya:** `components/Sidebar.tsx` (satır 80-200 civarı - navSections)
**Çözüm:**
```typescript
// Mevcut long label'ları kısalt
const navSections: NavSection[] = [
  {
    title: 'Genel',  // Kısa tut
    items: [
      { href: '/', label: 'Ana Ekran', icon: 'Dashboard' },
      // Gereksiz açıklamaları kaldır
    ],
  },
];
```

#### 4.2 Dashboard StatCard Açıklamaları
**Sorun:** `components/StatCard.tsx`'te detaylı gereksiz açıklamalar
**Dosya:** `components/StatCard.tsx`
**Çözüm:**
```tsx
//简洁 format: İkon + Sayı + Kısa Label
<div className="flex items-center gap-3">
  <Icon />
  <div>
    <div className="text-2xl font-bold">{value}</div>
    <div className="text-sm text-muted">{label}</div>
  </div>
</div>
```

---

### 5. HİYERARŞİ SORUNLARI 📊

#### 5.1 Dashboard Veri Yığını
**Sorun:** Tüm widget'lar düz listelenmiş, öncelik yok
**Dosya:** `app/page.tsx`
**Çözüm:**
```tsx
// Önem sırasına göre düzenle, collapsible sections
<section className="space-y-6">
  {/* 1. ÖNEMLİ - KPI Kartları */}
  <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
    <StatCard title="Aktif Servis" value={activeCount} />
    <StatCard title="Bugün Planlanan" value={todayCount} />
    <StatCard title="Geciken" value={overdueCount} />
    <StatCard title="Bekleyen" value={pendingCount} />
  </section>

  {/* 2. ORTA - Son İşlemler */}
  <section className="bg-white rounded-lg shadow p-6">
    <h2 className="text-lg font-semibold mb-4">Son Servisler</h2>
    <RecentServices limit={5} />
  </section>

  {/* 3. ALT - Diğer Widget'lar */}
  <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <WeatherWidget />
    <QuickActions />
  </section>
</section>
```

#### 5.2 Servisler Sayfası Toolbar Karmaşası
**Sorun:** `app/servisler/page.tsx` çok fazla filtre/buton yan yana
**Dosya:** `app/servisler/page.tsx`
**Çözüm:**
```tsx
// Filtreleri collapsible section içinde topla
<details className="bg-white rounded-lg shadow" open>
  <summary className="p-4 cursor-pointer font-medium">
    Filtreler ve Arama
  </summary>
  <div className="p-4 pt-0 space-y-4">
    {/* Filtreler buraya */}
  </div>
</details>
```

---

### 6. TUTARSIZ SPACING 📏

#### 6.1 Standart Spacing Scale Uygula
**Sorun:** Farklı bileşenlerde inconsistent spacing
**Dosya:** Tüm bileşenler
**Standart:**
```typescript
// Tailwind spacing scale kullan
const SPACING = {
  xs: '0.5rem',   // 2
  sm: '0.75rem',   // 3
  md: '1rem',      // 4
  lg: '1.5rem',    // 6
  xl: '2rem',      // 8
};

// Card padding: p-6 (1.5rem)
// Bileşen arası: mb-6 veya gap-6
// Section spacing: space-y-6
```

#### 6.2 Card Padding Standardizasyonu
**Dosya:** `components/ui/card.tsx`
**Çözüm:**
```tsx
// Standart card padding
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg border bg-white p-6 shadow-sm", className)}
    />
  )
);
```

**TEST:**
```typescript
// e2e/ui/spacing-consistency.spec.ts
test('card padding tutarlı olmalı', async ({ page }) => {
  const cards = page.locator('[class*="rounded-lg border"]');
  const firstPadding = await cards.first().evaluate(el =>
    getComputedStyle(el).padding
  );
  // Tüm card'lar aynı padding'e sahip olmalı
});
```

---

### 7. ACCESSIBILITY - KÜÇÜK TIKLAMA ALANLARI 👆

#### 7.1 Dropdown Butonları
**Sorun:** Tüm sayfalardaki dropdown menü butonları küçük
**Dosya:** `components/services/data-table.tsx` ve tüm dropdown'lar
**Çözüm:**
```tsx
// Minimum 44x44px touch target
<DropdownMenuTrigger asChild>
  <button className="h-11 w-11 flex items-center justify-center rounded-md hover:bg-accent">
    <MoreVertical className="h-4 w-4" />
  </button>
</DropdownMenuTrigger>
```

#### 7.2 İkon Butonlar
**Sorun:** Sadece ikon olan butonlarda hover alanı küçük
**Dosya:** `components/Sidebar.tsx`
**Çözüm:**
```tsx
// İkon etrafında padding ekle
<button className="p-3 hover:bg-accent rounded-md transition-colors">
  <Settings className="h-5 w-5" />
</button>
```

---

## UYGULAMA SIRASI

### FAZ 1: Temel Düzeltmeler (Önce bunları yap)
1. **Spacing Standartı** - Tüm card'lara p-6, aralara mb-6/gap-6
2. **Renk Uyumu** - Sidebar ve ana içerik arka planını eşle
3. **Responsive QuickActions** - Grid layout ekle

### FAZ 2: Layout İyileştirmeleri
4. **Dashboard Hiyerarşi** - Bölümleri ayır, spacing ekle
5. **Ayarlar Responsive Grid** - md breakpoint ekle
6. **Servisler Toolbar** - Collapsible section

### FAZ 3: İyileştirmeler
7. **Metin Kısaltma** - Sidebar ve Dashboard açıklamaları
8. **Touch Targets** - Minimum 44px buton boyutu
9. **Code Cleanup** - Hard-coded renkleri temizle

---

## TEST STRATEJISİ

Her değişiklikten önce test yaz:

```bash
# Test dosyası yapısı
e2e/
├── ui/
│   ├── color-consistency.spec.ts    # Renk uyumu testleri
│   ├── touch-targets.spec.ts        # Buton boyutu testleri
│   ├── responsive-layout.spec.ts    # Responsive testler
│   └── spacing-consistency.spec.ts  # Spacing testleri
```

Test komutu:
```bash
npx playwright test e2e/ui/
```

---

## KRİTİK DOSYALAR (Değiştirilecek Sırasıyla)

1. `app/globals.css` - Theme variables, spacing
2. `components/Sidebar.tsx` - Renk uyumu, menü kısaltma
3. `components/QuickActions.tsx` - Responsive grid
4. `app/page.tsx` - Dashboard hiyerarşi, spacing
5. `app/servisler/page.tsx` - Toolbar düzeni
6. `app/ayarlar/page.tsx` - Responsive grid
7. `components/services/data-table.tsx` - Touch targets
8. `components/ui/card.tsx` - Standart padding
9. `components/StatCard.tsx` - Açıklama kısaltma

---

## YASAKLAR ❌

- Yeni özellik ekleme (sadece düzenleme)
- Functionality değiştirme (sadece görsel)
- Database schema değiştirme
- API endpoint ekleme/değiştirme
- Third-party library ekleme (mevcut kütüphaneler kullan)

---

## BAŞARI KRİTERLERİ ✅

- [ ] Tüm sayfalarda horizontal scroll yok (mobilde)
- [ ] Tüm butonlar minimum 36px (önerilen 44px) touch target
- [ ] Sidebar ve ana içerik renk uyumlu
- [ ] Tüm card'lar aynı padding'e sahip (p-6)
- [ ] Dashboard hiyerarşisi açık (önce KPI, sonra detaylar)
- [ ] Menü metinleri kısa ve öz
- [ ] Tüm testler geçiyor

---

## SON NOT

Kullanıcı şikayeti: "sayfalar çok karmaşık, düzenler karışık, her yerde birşeyler yazıyor, sığmayan butonlar, sidebarla sayfa renk uyumsuzlukları, gereksiz açıklamalar."

Amaç: **Daha temiz, düzenli ve profesyonel bir görünüm.**

Her dosya değişikliğinden önce:
1. Mevcut durumu oku
2. Değişikliği yap
3. Test çalıştır
4. Başarıyı teyit et
