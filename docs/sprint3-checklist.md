# Sprint 3 Devam - Story Checklist ve Test Notlari

## WO-103 - Bulk actions bar (toplu islem)
- Ilgili dosyalar:
  - `components/services/data-table.tsx`
- Acceptance checklist:
  - [x] Row selection eklendi (header toplu secim + satir bazli secim).
  - [x] Secim oldugunda `bulk-actions-bar` gorunur hale getirildi.
  - [x] Toplu durum guncelleme aksiyonu eklendi.
  - [x] Toplu teknisyen atama aksiyonu eklendi (rol secimi ile).
  - [x] Toplu islemler mevcut `PATCH /api/services/[id]` akisini kullaniyor ve audit log uretiyor.
- Test notu:
  - Tip/Lint: `npm run typecheck`, hedefli `next lint` gecti.
  - Smoke: Secim barinin acilmasi ve aksiyon tetiklerinin render dogrulamasi manuel + e2e akisinda yapildi.

## OPS-902 - Health endpoint + smoke test
- Ilgili dosyalar:
  - `app/api/health/route.ts`
  - `app/health/route.ts`
  - `middleware.ts`
  - `playwright/tests/integration/deployment-smoke.spec.ts`
- Acceptance checklist:
  - [x] `GET /health` endpoint eklendi.
  - [x] Health cevabi `status`, `db`, `version`, `time` alanlarini donuyor.
  - [x] Middlewarede `/health` public route olarak acildi.
  - [x] Playwright smoke testi login -> list -> open detail akisiyla guncellendi.
- Test notu:
  - `npx playwright test playwright/tests/integration/deployment-smoke.spec.ts --project=chromium --reporter=line` ✅
  - `npm test` ✅

## Calistirilan dogrulamalar
- `npm run typecheck` ✅
- `npx next lint --file components/services/data-table.tsx --file app/api/health/route.ts --file app/health/route.ts --file middleware.ts --file playwright/tests/integration/deployment-smoke.spec.ts` ✅
- `npx playwright test playwright/tests/integration/deployment-smoke.spec.ts --project=chromium --reporter=line` ✅
