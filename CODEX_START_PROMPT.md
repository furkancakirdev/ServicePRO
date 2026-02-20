# ServicePro ERP - Codex Başlangıç Promptu

Bu dosyayı Codex'e kopyalayıp yapıştırabilirsiniz.

---

```
ServicePro ERP projesinde çalışıyorsun. Marlin Yatçılık için geliştirilmiş bir Next.js tabanlı ERP sistemidir.

**PROJE HEDEFİ:**
Uygulamanın 4 kritik sorununu çözmek:
1. Veri Güvenliği ve Yedekleme - NAS server'a otomatik backup sistemi kur
2. Dinamik Ayarlar Sistemi - Hard-coded değerleri database'den yönetilebilir hale getir
3. Filtreleme Sistemi - Excel-like inline column filters implement et
4. UI/UX Redesign - Classic Navy maritime tema + Hybrid light/dark + Customizable dashboard

**TECH STACK:**
- Next.js 14.2, React 18, TypeScript 5.0
- Prisma 6.19, PostgreSQL
- Tailwind CSS + Radix UI
- Playwright (testing)
- Docker Compose (deployment - NAS server)

**ÖNCELI KURALLAR:**

1. **TEST-FIRST APPROACH**: Her task tamamladıktan sonra Playwright test yaz VE çalıştır. Test geçmeden sonraki task'e geçme.

2. **STRICT TYPESCRIPT**: Tüm kodlarda TypeScript strict mode kullan. `any` kullanma.

3. **CODE CONSISTENCY**: Mevcut kod stilini koru:
   - Component'ler için `components/[category]/[name].tsx` yapısı
   - API routes için `app/api/[resource]/route.ts` yapısı
   - Türkçe değişken isimleri ve yorumlar kullan
   - CSS için Tailwind classes kullan (inline CSS yok)

4. **DATABASE MIGRATIONS**: Schema değişikliklerinde:
   - Önce `prisma/schema.prisma`'yi güncelle
   - Sonra `npx prisma migrate dev --name [description]` çalıştır
   - Sonra `npx prisma generate` çalıştır

5. **BREAKING CHANGES**: Breaking change yapmadan önce:
   - Backwards compatibility düşün
   - Migration script yaz
   - Mevcut veriyi koru

6. **TEST YAZMA KURALLARI:**
   - Test dosyası: `playwright/tests/[phase]/[task-name].spec.ts`
   - Test fonksiyonu: `test('[task description]', async ({ page }) => { ... })`
   - Login gereken testlerde `helpers/login.ts`'deki `loginAsAdmin()` fonksiyonunu kullan
   - UI element'lerinde `data-testid` attribute'larını kullan

**BAŞLANGIÇ:**

Önce `CODEX_IMPLEMENTATION_PLAN.md` dosyasını tamamen oku. Sonra Phase 1, Task 1.1'den başla.

**HER TASK İÇİN ADIMLAR:**

1. Implementasyon planında task'i oku ve anla
2. Gerekli dosyaları incele
3. Implementasyonu yap
4. Playwright test yaz
5. Test'i çalıştır: `npm run test:e2e [test-dosyasi]`
6. Test'in geçtiğini doğrula
7. Kullanıcıya task tamamlandığını bildir

**TEST DOSYASI YAPISI:**

```
playwright/tests/
├── helpers/
│   └── login.ts              # Login helper functions
├── backup/
│   ├── creation.spec.ts
│   ├── restore.spec.ts
│   └── api.spec.ts
├── admin/
│   ├── status.spec.ts
│   ├── konum.spec.ts
│   └── unvan.spec.ts
├── filters/
│   ├── inline.spec.ts
│   └── saved.spec.ts
└── theme/
    └── switching.spec.ts
```

**TEST ÖRNEĞİ:**

```typescript
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/login';

test('Backup creation', async ({ page }) => {
  // 1. Login as admin
  await loginAsAdmin(page);

  // 2. Navigate to backup page
  await page.goto('/ayarlar/yedekleme');

  // 3. Click backup button
  await page.click('[data-testid="backup-create-button"]');

  // 4. Wait for backup to complete
  await page.waitForSelector('[data-testid="backup-success-message"]');

  // 5. Verify backup appears in list
  const backupList = page.locator('[data-testid="backup-list"]');
  await expect(backupList).toContainText('servicepro-');
});
```

**DATA-TESTID CONVENTION:**

Button: `data-testid="[action]-button"` → `backup-create-button`
Input: `data-testid="[field]-input"` → `status-label-input`
Table: `data-testid="[resource]-table"` → `status-list-table`
Dialog: `data-testid="[action]-dialog"` → `status-create-dialog`

**SORUN SORUNMA:**

Eğer herhangi bir noktada takılırsan:
1. Implementasyon planını tekrar oku
2. Mevcut kodu incele
3. Kullanıcıya açık bir soru sor

**ŞİMDİ BAŞLA:**

1. `CODEX_IMPLEMENTATION_PLAN.md` dosyasını oku
2. Phase 1, Task 1.1: "Backup Service Implementation" ile başla
3. İlk implementasyonunu yap
4. İlk testini yaz ve çalıştır

İyi çalışmalar!
```
