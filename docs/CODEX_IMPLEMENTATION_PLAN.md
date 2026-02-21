# ServicePro ERP - Codex Implementation Plan

**Proje**: Marlin Yatçılık ServicePro ERP Redesign
**Başlangıç Tarihi**: 18 February 2026
**Estimated Total**: 35-45 iş günü

---

## 🎯 GENEL BİLGİ

Bu implementasyon planı, ServicePro ERP uygulamasının 4 kritik sorununu çözmek için hazırlanmıştır:

1. **Veri Güvenliği ve Yedekleme**: NAS server'a otomatik backup sistemi
2. **Dinamik Ayarlar Sistemi**: Hard-coded değerlerin database'den yönetimi
3. **Filtreleme Sistemi**: Excel-like inline column filters
4. **UI/UX Redesign**: Classic Navy maritime tema + Hybrid light/dark + Customizable dashboard

### Kullanıcı Kararları
- **Backup**: NAS server'a local directory (JSON) + Docker Compose
- **Tema**: Hybrid (User Selectable) - Classic Navy Light + Dark
- **Dashboard**: Customizable (Drag & Drop)
- **Filtreler**: Inline Column Filters (Excel-like)
- **Dinamik Ayarlar**: Status, Konum, Personel Roller, RBAC, Personel isim düzenleme

---

## 📋 PHASE-BASED IMPLEMENTATION PLAN

### PHASE 1: VERİ GÜVENLİĞİ VE YEDEKLEME (4-5 gün)

#### Task 1.1: Backup Service Implementation (2-3 gün)

**Dosyalar:**
- `lib/backup/db-export.ts` (YENİ)
- `lib/backup/sheets-export.ts` (YENİ)
- `lib/backup/config-export.ts` (YENİ)
- `lib/backup/types.ts` (YENİ)
- `lib/backup/index.ts` (YENİ)

**Yapılacaklar:**
```typescript
// lib/backup/db-export.ts
// PostgreSQL'den tüm verileri JSON formatında export et
// - Tüm tabloları fetch et
// - Relation'ları çöz
// - Timestamp ve metadata ekle
// - JSON file olarak yaz

// lib/backup/sheets-export.ts
// Google Sheets sync loglarını export et
// - SyncHistory tablosunu dump et
// - Conflict resolution loglarını kaydet

// lib/backup/config-export.ts
// System ayarlarını export et
// - SystemSetting tablosunu dump et
// - Environment variables'ı (maskeli şekilde) kaydet

// Backup formatı:
{
  "version": "1.0",
  "timestamp": "2026-02-18T12:00:00Z",
  "metadata": {
    "recordCount": 5215,
    "tables": ["Service", "Personel", "User", "Tekne", ...]
  },
  "data": {
    "Service": [...],
    "Personel": [...],
    ...
  }
}
```

**Test:**
```typescript
// playwright/tests/backup.spec.ts
test('Backup creation', async ({ page }) => {
  // 1. Login as admin
  // 2. Navigate to /ayarlar/yedekleme
  // 3. Click "Yedek Oluştur" button
  // 4. Verify backup file is created
  // 5. Verify backup file contains valid JSON
  // 6. Verify all tables are included
});
```

---

#### Task 1.2: Restore Service Implementation (1 gün)

**Dosyalar:**
- `lib/backup/restore.ts` (YENİ)
- `app/api/backup/restore/route.ts` (YENİ)

**Yapılacaklar:**
```typescript
// lib/backup/restore.ts
// JSON backup'tan veriyi geri yükle
// - JSON dosyasını validate et
// - Mevcut veriyi backup al (önce yedek al!)
// - Tabloları truncate et
// - Veriyi insert et (sırayla, foreign key respect)
// - ID mapping için cache kullan
```

**Test:**
```typescript
test('Backup restore', async ({ page }) => {
  // 1. Create a test service
  // 2. Create backup
  // 3. Delete the service
  // 4. Restore from backup
  // 5. Verify service is restored correctly
});
```

---

#### Task 1.3: Docker Volume Mount & API (0.5 gün)

**Dosyalar:**
- `docker-compose.yml` (DEĞİŞİKLİK)
- `app/api/backup/route.ts` (YENİ)
- `app/api/backup/list/route.ts` (YENİ)
- `app/api/backup/download/route.ts` (YENİ)

**Yapılacaklar:**
```yaml
# docker-compose.yml
services:
  app:
    volumes:
      - /path/on/nas/backups:/app/backups
```

```typescript
// app/api/backup/route.ts
// GET - Backup listesi
// POST - Yeni backup oluştur

// app/api/backup/download/route.ts
// GET - Backup file download
```

**Test:**
```typescript
test('Backup API endpoints', async ({ request }) => {
  // Test POST /api/backup - creates backup
  // Test GET /api/backup - lists backups
  // Test GET /api/backup/download/:id - downloads file
});
```

---

#### Task 1.4: Automated Scheduling (1 gün)

**Dosyalar:**
- `lib/backup/scheduler.ts` (YENİ)
- `app/api/cron/backup/route.ts` (YENİ)

**Yapılacaklar:**
```typescript
// lib/backup/scheduler.ts
// - Daily automated backup (gece yarısı)
// - Retention policy uygulama (30 gün)
// - Cleanup function (eski dosyaları sil)
// - Notification system (backup başarılı/başarısız)
```

**Test:**
```typescript
test('Automated backup scheduling', async ({ page }) => {
  // 1. Set retention policy to 1 day
  // 2. Trigger manual backup twice
  // 3. Verify only 1 backup remains (oldest deleted)
});
```

---

### PHASE 2: DİNAMİK AYARLAR SİSTEMİ (8-10 gün)

#### Task 2.1: Database Schema Changes (1 gün)

**Dosyalar:**
- `prisma/schema.prisma` (DEĞİŞİKLİK)
- `prisma/migrations/` (YENİ MIGRATION)

**Yapılacaklar:**
```prisma
// Yeni tablolar ekle:

model ServisDurumu {
  id          String   @id @default(cuid())
  key         String   @unique
  label       String
  description String?
  color       String
  icon        String?
  sirasi      Int
  aktif       Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relation to existing Service
  services    Service[]
}

model Konum {
  id          String   @id @default(cuid())
  key         String   @unique
  label       String
  adres       String?
  telefon     String?
  sirasi      Int
  aktif       Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  services    Service[]
}

model PersonelUnvan {
  id          String   @id @default(cuid())
  key         String   @unique
  label       String
  puanCarpani Decimal @default(1.0)
  sirasi      Int
  aktif       Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  personel    Personel[]
}

model SystemSetting {
  id          String   @id @default(cuid())
  key         String   @unique
  value       String   // JSON string for complex values
  category    String   // general, backup, scoring, ui
  description String?
  updatedAt   DateTime @updatedAt
}

// Mevcut modellere foreign keys ekle:
// Service.durum -> ServisDurumu
// Service.konum -> Konum
// Personel.unvan -> PersonelUnvan
```

**Migration:**
```bash
npx prisma migrate dev --name add_dynamic_settings
```

**Test:**
```typescript
test('Database schema changes', async () => {
  // Verify new tables exist
  // Verify foreign keys work
  // Verify indexes are created
});
```

---

#### Task 2.2: Runtime Configuration Service (2 gün)

**Dosyalar:**
- `lib/config/dynamic-settings.ts` (YENİ)
- `lib/config/status-cache.ts` (YENİ)
- `lib/config/konum-cache.ts` (YENİ)
- `lib/config/unvan-cache.ts` (YENİ)

**Yapılacaklar:**
```typescript
// lib/config/dynamic-settings.ts
// - Get all settings (cached)
// - Get setting by key
// - Invalidate cache on update
// - Fallback to defaults if DB empty

// lib/config/status-cache.ts
// - Get all active statuses (cached)
// - Get status by key
// - Invalidate cache on status update

// Similar for Konum, Unvan, etc.
```

**Test:**
```typescript
test('Dynamic settings cache', async () => {
  // 1. Fetch settings (should cache)
  // 2. Update setting via API
  // 3. Fetch again (should return new value, cache invalidated)
});
```

---

#### Task 2.3: Admin UI - Status Yönetimi (2 gün)

**Dosyalar:**
- `app/ayarlar/durumlar/page.tsx` (YENİ)
- `components/admin/durumlar/DurumlarTable.tsx` (YENİ)
- `components/admin/durumlar/DurumDialog.tsx` (YENİ)
- `app/api/admin/durumlar/route.ts` (YENİ)
- `app/api/admin/durumlar/[id]/route.ts` (YENİ)

**Yapılacaklar:**
```tsx
// /ayarlar/durumlar page
// - Table: Key, Label, Color, Icon, Sıra, Aktif, İşlem
// - Add/Edit dialog
// - Delete confirmation
// - Color picker
// - Icon picker (lucide-react)
// - Drag & drop for sıralama
```

**UI Mock:**
```
┌─────────────────────────────────────────────────────────────┐
│  Servis Durumları                            [+ Yeni Ekle]  │
├─────────────────────────────────────────────────────────────┤
│  Key              Label            Renk     Sıra    İşlem    │
│  ─────────────────────────────────────────────────────────  │
│  RANDEVU_VERILDI  Randevu Verildi  🟢      1       ✏️ 🗑️   │
│  DEVAM_EDIYOR     Devam Ediyor     🔵      2       ✏️ 🗑️   │
│  TAMAMLANDI       Tamamlandı        ✅      3       ✏️ 🗑️   │
│  PARCA_BEKLIYOR   Parça Bekliyor    🟡      4       ✏️ 🗑️   │
└─────────────────────────────────────────────────────────────┘
```

**Test:**
```typescript
test('Status management CRUD', async ({ page }) => {
  // 1. Login as admin
  // 2. Navigate to /ayarlar/durumlar
  // 3. Click "Yeni Ekle"
  // 4. Fill form: key="TEST", label="Test Durumu", color="#FF0000"
  // 5. Submit
  // 6. Verify new status appears in table
  // 7. Click edit, change label
  // 8. Verify update successful
  // 9. Click delete, confirm
  // 10. Verify status removed
});
```

---

#### Task 2.4: Admin UI - Konum Yönetimi (1.5 gün)

**Dosyalar:**
- `app/ayarlar/konumlar/page.tsx` (YENİ)
- `components/admin/konumlar/KonumlarTable.tsx` (YENİ)
- `components/admin/konumlar/KonumDialog.tsx` (YENİ)
- `app/api/admin/konumlar/route.ts` (YENİ)
- `app/api/admin/konumlar/[id]/route.ts` (YENİ)

**Test:**
```typescript
test('Location management CRUD', async ({ page }) => {
  // Similar to status management test
  // Verify: key, label, adres, telefon fields
});
```

---

#### Task 2.5: Admin UI - Personel Unvan Yönetimi (1.5 gün)

**Dosyalar:**
- `app/ayarlar/unvanlar/page.tsx` (YENİ)
- `components/admin/unvanlar/UnvanlarTable.tsx` (YENİ)
- `components/admin/unvanlar/UnvanDialog.tsx` (YENİ)
- `app/api/admin/unvanlar/route.ts` (YENİ)
- `app/api/admin/unvanlar/[id]/route.ts` (YENİ)

**Test:**
```typescript
test('Personel unvan management CRUD', async ({ page }) => {
  // Similar to status management test
  // Verify: key, label, puanCarpani fields
});
```

---

#### Task 2.6: Migration from Hard-coded to Dynamic (1-2 gün)

**Dosyalar:**
- `scripts/migrate-to-dynamic.ts` (YENİ)
- `types/index.ts` (DEĞİŞİKLİK - keep for backwards compat)
- `lib/rbac/permissions.ts` (DEĞİŞİKLİK - make dynamic)

**Yapılacaklar:**
```typescript
// scripts/migrate-to-dynamic.ts
// 1. Read hard-coded values from types/index.ts
// 2. Insert into ServisDurumu, Konum, PersonelUnvan tables
// 3. Update existing Service records to use new IDs
// 4. Update existing Personel records to use new IDs
// 5. Verify migration success

// After migration, types/index.ts becomes:
export type ServisDurumu = string; // Dynamic from DB
export type PersonelUnvan = string; // Dynamic from DB
// But keep old enums for backwards compatibility during transition
```

**Test:**
```typescript
test('Migration from hard-coded to dynamic', async () => {
  // 1. Run migration script
  // 2. Verify ServisDurumu table has all statuses
  // 3. Verify Konum table has all locations
  // 4. Verify PersonelUnvan table has all titles
  // 5. Verify Service records still have correct durum
  // 6. Verify Personel records still have correct unvan
});
```

---

### PHASE 3: FİLTRELEME SİSTEMİ (6-8 gün)

#### Task 3.1: Inline Filter Components (3-4 gün)

**Dosyalar:**
- `components/servisler/filters/InlineColumnFilter.tsx` (YENİ)
- `components/servisler/filters/TextFilter.tsx` (YENİ)
- `components/servisler/filters/DateRangeFilter.tsx` (YENİ)
- `components/servisler/filters/MultiSelectFilter.tsx` (YENİ)
- `components/servisler/filters/FilterActiveBadges.tsx` (YENİ)

**Yapılacaklar:**
```tsx
// InlineColumnFilter.tsx
// - Column header'e tıklayınca açılan popover
// - Filter type'a göre children component render
// - Aktif filter varsa badge göster
// - Clear butonu

// TextFilter.tsx
// - Search input
// - Arama sonuçlarına göre filtrele
// - Debounce (300ms)

// DateRangeFilter.tsx
// - Start date picker
// - End date picker
// - Quick presets: Bugün, Bu Hafta, Bu Ay

// MultiSelectFilter.tsx
// - Checkbox listesi
// - Select All / Deselect All
// - Search within options

// FilterActiveBadges.tsx
// - Aktif filter'ları göster
// - Badge'e tıklayınca filter'i kaldır
// - "Tümünü Temizle" butonu
```

**Test:**
```typescript
test('Inline column filters', async ({ page }) => {
  // 1. Go to /servisler
  // 2. Click "Tekne Adı" column header
  // 3. Verify filter popover opens
  // 4. Type "Moon" in search
  // 5. Verify table shows only Moonlight
  // 6. Click "Durum" column header
  // 7. Select "TAMAMLANDI"
  // 8. Verify table shows only completed Moonlight services
  // 9. Verify filter badges appear
  // 10. Click badge to remove filter
  // 11. Verify filter is removed
});
```

---

#### Task 3.2: Filter State Management (2 gün)

**Dosyalar:**
- `lib/servisler/filter-state.ts` (YENİ)
- `lib/servisler/filter-url.ts` (YENİ)
- `app/servisler/page.tsx` (DEĞİŞİKLİK)

**Yapılacaklar:**
```typescript
// lib/servisler/filter-state.ts
interface ServisFilterState {
  tarih?: { start: Date; end: Date };
  saat?: string[];
  tekneAdi?: string;
  durum?: string[];
  konum?: string[];
  sorumlu?: string[];
  // ... other columns
}

// Filter state management:
// - Initialize from URL params
// - Update URL on filter change
// - Persist to localStorage
// - Load from localStorage on mount

// lib/servisler/filter-url.ts
// - Serialize filter state to URL
// - Parse URL to filter state
// - Support for: ?tarih=2026-02-01,2026-02-28&durum=TAMAMLANDI,PARCA_BEKLIYOR
```

**Test:**
```typescript
test('Filter state persistence', async ({ page }) => {
  // 1. Apply filters
  // 2. Refresh page
  // 3. Verify filters are still active
  // 4. Copy URL, open in new tab
  // 5. Verify filters apply in new tab
});
```

---

#### Task 3.3: Saved Filters (1-2 gün)

**Dosyalar:**
- `components/servisler/SavedFilters.tsx` (YENİ)
- `app/api/servisler/saved-filters/route.ts` (YENİ)
- `app/api/servisler/saved-filters/[id]/route.ts` (YENİ)

**Yapılacaklar:**
```tsx
// SavedFilters component
// - Save current filter combination as named preset
// - List saved filters
// - Load saved filter
// - Delete saved filter
// - Share filter (generate URL)
```

**Test:**
```typescript
test('Saved filters', async ({ page }) => {
  // 1. Apply some filters
  // 2. Click "Kaydet"
  // 3. Enter name "Bugünün İşleri"
  // 4. Verify filter appears in saved list
  // 5. Apply different filters
  // 6. Click "Bugünün İşleri" saved filter
  // 7. Verify original filters are applied
});
```

---

#### Task 3.4: Remove Old Faceted Filters (0.5 gün)

**Dosyalar:**
- `components/services/data-table-faceted-filter.tsx` (SİL)
- `components/services/data-table-toolbar.tsx` (DEĞİŞİKLİK - remove old filters)
- `app/servisler/page.tsx` (DEĞİŞİKLİK - remove old filter components)

**Yapılacaklar:**
```typescript
// Remove all faceted filter components
// Remove faceted filter state management
// Remove faceted filter UI
// Verify no references left
```

**Test:**
```typescript
test('Old filters removed', async ({ page }) => {
  // 1. Go to /servisler
  // 2. Verify old faceted filter UI is gone
  // 3. Verify new inline filters work
});
```

---

### PHASE 4: UI/UX REDESIGN (8-12 gün)

#### Task 4.1: Design System Update - Classic Navy (1-2 gün)

**Dosyalar:**
- `app/globals.css` (DEĞİŞİKLİK)
- `tailwind.config.ts` (DEĞİŞİKLİK)
- `lib/theme/colors.ts` (YENİ)

**Yapılacaklar:**
```css
/* Light Theme (Default) - Classic Navy */
:root {
  --primary: 0 51% 20%; /* #003366 - Navy Blue */
  --primary-foreground: 0 0% 100%;
  --secondary: 210 20% 96%; /* #F5F5F5 */
  --secondary-foreground: 222 47% 11%;
  --accent: 199 100% 44%; /* #1E90FF - Dodger Blue */
  --success: 142 76% 36%; /* #22C55E */
  --warning: 38 92% 50%; /* #F59E0B */
  --error: 0 72% 51%; /* #EF4444 */
  --background: 0 0% 100%; /* #FFFFFF */
  --foreground: 222 47% 11%; /* #0F172A */
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;
  --border: 214 32% 91%;
  --radius: 0.5rem;
}

/* Dark Theme - Maritime Dark */
.dark {
  --primary: 217 91% 60%; /* #3B82F6 */
  --background: 222 47% 11%; /* #0F172A */
  --foreground: 210 40% 98%; /* #F1F5F9 */
  --muted: 217 33% 17%; /* #1E293B */
  --muted-foreground: 215 20% 65%;
  --border: 217 33% 17%;
}
```

**Test:**
```typescript
test('Theme colors', async ({ page }) => {
  // 1. Verify primary color is #003366 in light mode
  // 2. Switch to dark mode
  // 3. Verify colors are correct
  // 4. Check contrast ratios (WCAG AA)
});
```

---

#### Task 4.2: Hybrid Theme Implementation (2-3 gün)

**Dosyalar:**
- `components/ThemeProvider.tsx` (YENİ)
- `components/ThemeSwitcher.tsx` (YENİ)
- `components/Sidebar.tsx` (DEĞİŞİKLİK - add theme switcher)
- `lib/hooks/use-theme.ts` (YENİ)

**Yapılacaklar:**
```tsx
// ThemeProvider component
// - Theme context provide et
// - localStorage'dan theme preference oku
// - body'ye theme class ekle (light/dark)
// - Transition animation

// ThemeSwitcher component
// - Sun/Moon icon toggle
// - Dropdown with Light/Dark/System options
// - User preference'ı kaydet

// lib/hooks/use-theme.ts
// - useTheme hook
// - theme, setTheme, toggleTheme functions
```

**Test:**
```typescript
test('Theme switching', async ({ page }) => {
  // 1. Verify default theme is light
  // 2. Click theme switcher
  // 3. Select dark mode
  // 4. Verify theme changes to dark
  // 5. Refresh page
  // 6. Verify dark mode persists
});
```

---

#### Task 4.3: Customizable Dashboard (3-4 gün)

**Dosyalar:**
- `components/dashboard/DashboardGrid.tsx` (YENİ)
- `components/dashboard/DashboardWidget.tsx` (YENİ)
- `components/dashboard/WidgetLibrary.tsx` (YENİ)
- `lib/dashboard/widget-registry.ts` (YENİ)
- `app/api/dashboard/layout/route.ts` (YENİ)
- `app/api/dashboard/layout/[id]/route.ts` (YENİ)

**Yapılacaklar:**
```tsx
// DashboardGrid component
// - Drag and drop support (react-grid-layout or dnd-kit)
// - Edit mode toggle
// - Widget resize
// - Save layout to DB

// Widget types:
// - StatCard (single KPI)
// - Chart (line, bar, pie)
// - Table (recent services, urgent items)
// - List (personnel status, waiting parts)
// - Calendar (schedule view)

// WidgetLibrary
// - Available widgets list
// - Drag to add to dashboard
// - Widget configuration

// API routes:
// - GET /api/dashboard/layout - get user's layout
// - POST /api/dashboard/layout - save layout
// - PUT /api/dashboard/layout/:id - update widget config
```

**Test:**
```typescript
test('Dashboard customization', async ({ page }) => {
  // 1. Go to dashboard
  // 2. Click "Düzenle" button
  // 3. Drag widget to new position
  // 4. Click "Kaydet"
  // 5. Refresh page
  // 6. Verify widget position is saved
  // 7. Click "Widget Ekle"
  // 8. Add new widget
  // 9. Verify new widget appears
});
```

---

#### Task 4.4: Component Consistency Update (2-3 gün)

**Dosyalar:**
- Tüm `components/ui/*.tsx` dosyaları
- `components/Sidebar.tsx`
- `components/Header.tsx`
- `components/StatCard.tsx`
- `components/servisler/*.tsx`

**Yapılacaklar:**
```tsx
// Update all components to use new design tokens
// - Consistent spacing
// - Consistent border radius
// - Consistent shadows
// - Consistent typography
// - Remove glassmorphism effects (optional, keep minimal)
// - Update colors to match new theme
```

**Test:**
```typescript
test('Component consistency', async ({ page }) => {
  // 1. Navigate through all pages
  // 2. Verify consistent styling
  // 3. Check all buttons, inputs, cards
  // 4. Verify no old styling artifacts
});
```

---

### PHASE 5: PERSONEL İSİM DÜZENLEME (0.5 gün)

#### Task 5.1: Personel Edit Page Enhancement (0.5 gün)

**Dosyalar:**
- `app/personel/[id]/duzenle/page.tsx` (DEĞİŞİKLİK veya YENİ)
- `components/personel/PersonelEditForm.tsx` (DEĞİŞİKLİK)

**Yapılacaklar:**
```tsx
// Add "ad" (name) field to edit form
// - Make it editable (currently read-only?)
// - Add validation
// - Update API to allow name changes
// - Update audit trail (if exists)
```

**Test:**
```typescript
test('Personel name editing', async ({ page }) => {
  // 1. Go to personel edit page
  // 2. Change name
  // 3. Submit
  // 4. Verify name is updated
  // 5. Verify name appears correctly in UI
});
```

---

### PHASE 6: TEST & DEPLOYMENT (3-4 gün)

#### Task 6.1: Integration Testing (2 gün)

**Dosyalar:**
- `playwright/tests/integration/backup.spec.ts` (YENİ)
- `playwright/tests/integration/filters.spec.ts` (YENİ)
- `playwright/tests/integration/admin.spec.ts` (YENİ)
- `playwright/tests/integration/theme.spec.ts` (YENİ)
- `playwright/tests/integration/dashboard.spec.ts` (YENİ)

**Yapılacaklar:**
```typescript
// End-to-end integration tests
// - Full backup/restore cycle
// - Admin creates new status, uses it in service
// - Filter combinations, saved filters
// - Theme switching persistence
// - Dashboard customization save/load
```

---

#### Task 6.2: User Acceptance Testing (1-2 gün)

**Dosyalar:**
- `playwright/tests/uat/*.spec.ts` (YENİ)

**Yapılacaklar:**
```typescript
// Real-world user scenarios
// - Teknisyer creates service, updates status
// - Admin manages statuses, locations
// - User filters services by multiple criteria
// - User customizes dashboard
// - Backup/restore after data change
```

---

#### Task 6.3: Production Deployment (0.5 gün)

**Dosyalar:**
- `docker-compose.prod.yml` (YENİ)
- `.env.production` (GÜNCELLE)
- `DEPLOYMENT.md` (YENİ)

**Yapılacaklar:**
```bash
# Deployment steps
# 1. Build production image
# 2. Run database migrations
# 3. Run migration script for dynamic settings
# 4. Deploy to NAS server
# 5. Verify backup directory is mounted
# 6. Test all critical functions
# 7. Monitor for errors
```

---

## 🎮 PLAYWRIGHT TEST STRUCTURE

```bash
playwright/tests/
├── backup/
│   ├── creation.spec.ts           # Backup creation tests
│   ├── restore.spec.ts            # Restore tests
│   ├── api.spec.ts                # Backup API tests
│   └── scheduling.spec.ts         # Automated backup tests
├── admin/
│   ├── status.spec.ts             # Status management tests
│   ├── konum.spec.ts             # Location management tests
│   ├── unvan.spec.ts             # Title management tests
│   └── permissions.spec.ts        # RBAC tests
├── filters/
│   ├── inline.spec.ts             # Inline column filter tests
│   ├── state.spec.ts              # Filter state tests
│   └── saved.spec.ts              # Saved filters tests
├── theme/
│   ├── colors.spec.ts             # Theme color tests
│   ├── switching.spec.ts          # Theme switch tests
│   └── persistence.spec.ts        # Theme persistence tests
├── dashboard/
│   ├── customization.spec.ts      # Dashboard customization tests
│   └── widgets.spec.ts            # Widget tests
├── integration/
│   ├── backup-restore.spec.ts    # Full backup/restore cycle
│   ├── admin-workflow.spec.ts     # Admin creates and uses dynamic values
│   └── filter-workflow.spec.ts    # Complex filter scenarios
└── uat/
    ├── teknisyen-flow.spec.ts     # Teknisyer daily workflow
    ├── admin-flow.spec.ts         # Admin management workflow
    └── reporting-flow.spec.ts     # Reporting workflow
```

---

## 📝 CODEX BAŞLANGIÇ PROMPTU

Aşağıdaki prompt'u Codex'e kopyalayıp yapıştırabilirsiniz:

```
ServicePro ERP projesinde çalışıyorsun. Implementasyon için aşağıdaki planı takip et:

**ÖNCELI KURALLAR:**
1. Her task tamamladıktan sonra Playwright test yaz ve çalıştır
2. Test geçmeden sonraki task'e geçme
3. Her implementasyonda TypeScript strict mode kullan
4. Mevcut kod stilini koru, commenting convention'a uyu
5. Database değişikliklerinde önce migration yaz, sonra prisma generate
6. Breaking change yapmadan önce backwards compatibility düşün

**BAŞLANGIÇ:**
Önce `CODEX_IMPLEMENTATION_PLAN.md` dosyasını oku ve Phase 1, Task 1.1'den başla.

**HER TASK İÇİN:**
1. Plan dosyasında task'i oku
2. Implementasyonu yap
3. Playwright test yaz
4. Test'i çalıştır ve geçtiğini doğrula
5. Bir sonraki task'e geç

**TEST YAZMA KURALLARI:**
- Test dosyası: `playwright/tests/[phase]/[task-name].spec.ts`
- Test fonksiyonu: `test('[task description]', async ({ page }) => { ... })`
- Login gereken testlerde önce helper fonksiyon kullan
- Testlerde data-testid attribute'ları kullanmak zorundasın

**SORUN SORUNMA:**
Herhangi bir sorunda kullanıcıya sor ve açıklama iste.

Şimdi `CODEX_IMPLEMENTATION_PLAN.md` dosyasını oku ve Phase 1, Task 1.1 ile başla.
```

---

## 🔗 KRİTİK DOSYALAR REFERANSI

### Mevcut Kritik Dosyalar (Implementasyonda Kullanılacak)
```
prisma/schema.prisma           # Database schema - yeni tablolar buraya
app/globals.css                # Theme colors - buraya güncellenecek
components/Sidebar.tsx          # Navigation - theme switcher eklenecek
lib/auth/auth-context.tsx       # Auth context - reference for RBAC
lib/rbac/permissions.ts         # Hard-coded permissions - dynamic yapılacak
types/index.ts                  # Hard-coded enums - migration için kullanılacak
app/api/yedekleme/route.ts      # Mock backup - gerçek implementasyon buraya
middleware.ts                   # Auth middleware - reference için
app/servisler/page.tsx          # Filters - yeni sistem buraya gelecek
```

---

**Plan Version**: 1.0
**Last Updated**: 18 February 2026
**Status**: Ready for Codex Implementation
