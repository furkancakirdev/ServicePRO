# Strateji Plani

## Hedefler
1. Servisler/Operasyon varsayilan gorunumu `RANDEVU_VERILDI + DEVAM_EDIYOR` yapmak.
2. Google Sheets tarih/status/lokasyon dogrulugunu guclendirmek.
3. Operasyon sayfasina ilk bakista karar verdiren KPI + tablo + dagilim panelleri eklemek.
4. Mobil teknisyen uygulamasi icin benchmark + MVP + roadmap cikarmak.

## Fazlar ve Durum
- [x] Faz 0: Dokuman iskeleti ve baz cizgi olcumu
- [x] Faz 1: Sync parser/metadata guclendirme
- [x] Faz 2: Servisler varsayilan filtre + tarihsiz durum ozeti
- [x] Faz 3: Operasyon ilk bakis panel yeniden tasarimi
- [x] Faz 4: `/api/operations/overview` endpoint + hesaplama katmani
- [x] Faz 5: Unit + Regression + Playwright E2E kapilari
- [x] Faz 6: Mobil benchmark + MVP + uzun vadeli roadmap
- [x] Faz 7: Vercel preview/prod dagitim adimlari

## Teknik Kararlar
- Date parsing sirasi: Excel serial -> delimited (`dd.mm`, `dd/mm`, `yyyy-mm`) -> text month -> native fallback
- Sync metadata: satir bazli warning listesi `metadata.warnings` uzerinden API `dateValidation` alanina tasiniyor
- Lokasyon kanonigi: `YATMARIN`, `NETSEL`, `DIS_SERVIS`
- Durum kanonigi: uygulama seviyesi `DEVAM_EDIYOR`
- Operasyon KPI hesaplama UI'dan bagimsiz: `lib/operations/overview.ts`
- DB uyumu: `users/personel/tekne/servis/settings/audit_log` modellerine `organization_id` map'leri eklendi, create patlamasi kapatildi
- E2E kararlilik: Playwright `PLAYWRIGHT_PORT`/`PLAYWRIGHT_BASE_URL` ile parametrik, cakisan localhost portuna bagimli degil
- Deploy fallback: claimable endpoint (`claude-skills-deploy`) ile preview URL + claim URL alinabiliyor

## Test Kapilari
1. `npm run sync:validate` -> PASS (kritik mismatch: 0)
2. `npm run sync:validate:strict` -> PASS (missing/extra/mismatch: 0)
3. `npm run test:unit` -> PASS
4. `npm run test:regression` -> PASS
5. `npm run test:e2e -- e2e/servisler-operations.spec.ts` -> PASS (7/7)
6. `npm run typecheck` -> PASS
7. `npm run build:strict` -> PASS

## Dagitim Plani
1. [x] Preview deploy denemesi al (claimable endpoint)
2. [x] Production deploy + smoke test (Playwright) tamamlandi
3. [x] Sync validation ozetini kontrol et (`npm run sync:validate:strict` PASS)
4. [x] Production promote et (`vercel deploy --prod --yes`)
5. [x] Deploy linklerini `docs/mevcut-durum.md` dosyasina isle

## Mobil Yol Haritasi
- Ayrintili benchmark: `docs/mobile-saha-servis-benchmark.md`
- MVP odak: is listesi, durum guncelleme, rapor, malzeme, fotograf, offline queue
- Rol siniri: teknisyen `RAPOR_BEKLIYOR` seviyesine kadar, final kapanis/puanlama yetkilide

## Engeller
- Kapanan engel: `organization_id` null constraint nedeniyle sync create hatasi.
- Uygulanan cozum: Prisma schema model uyumu + client regenerate + reconcile + strict validate.
- Kalan risk: Vercel projesinde environment variable tanimlari bos. Ozellikle `DATABASE_URL` olmadan DB bagimli endpointler runtime'da hata verebilir.
