# P0 Story Checklist ve Test Notlari

Bu dokuman, `Yaml backlog.txt` icindeki P0 story'lerin sira ile uygulanmis halini ve kisa test notlarini icerir.

## UX-001 - Global layout standardi
- Ilgili dosyalar:
  - `components/layout/page-content.tsx`
  - `components/layout/page-header.tsx`
  - `app/page.tsx`
  - `app/servisler/page.tsx`
  - `app/servisler/yeni/page.tsx`
  - `app/servisler/[id]/duzenle/page.tsx`
  - `app/servisler/[id]/page.tsx`
  - `app/globals.css`
- Acceptance checklist:
  - [x] Ana sayfalarda `PageHeader` kullanimi standartlandi.
  - [x] Primary action'lar sag ust bolgede toplandi.
  - [x] Sidebar aktif menu stili tek tip (`.sidebar-link.active`) hale getirildi.
  - [x] Sayfa container/padding hizasi ortak `PageContent` ile birlestirildi.
- Test notu:
  - Manuel: Dashboard, Is Emirleri, Yeni, Duzenle ve Detay ekranlarinda header/aksiyon hiyerarsisi kontrol edildi.

## UX-002 - Spacing & typography scale
- Ilgili dosyalar:
  - `app/globals.css`
  - `components/layout/page-content.tsx`
  - `components/layout/page-header.tsx`
  - `app/page.tsx`
  - `app/servisler/page.tsx`
- Acceptance checklist:
  - [x] Ortak spacing ritmi (`space-y`, panel padding, container padding) ana ekranlarda uyumlu kullanildi.
  - [x] Kart/panel bosluklari dashboard ve liste ekranlarinda standarda cekildi.
  - [x] Baslik hiyerarsisi `page-title` / `page-subtitle` ile teklestirildi.
- Test notu:
  - Manuel: 1280 ve 1440 genislikte kart araliklari ve baslik olcekleri karsilastirildi.

## UX-003 - Empty / Loading / Error state seti
- Ilgili dosyalar:
  - `components/ui/page-states.tsx`
  - `app/loading.tsx`
  - `app/error.tsx`
  - `app/servisler/loading.tsx`
  - `app/servisler/error.tsx`
  - `app/page.tsx`
  - `app/servisler/page.tsx`
- Acceptance checklist:
  - [x] `PageEmptyState`, `PageLoadingState`, `PageErrorState` ortak component seti olusturuldu.
  - [x] Dashboard'da loading/error/empty durumlari baglandi.
  - [x] Is Emirleri sayfasinda loading/error/empty durumlari baglandi.
- Test notu:
  - Manuel: veri olmayan durum, API hata durumu ve yukleme senaryolarinda fallback ekranlari dogrulandi.

## UX-004 - Microcopy cleanup
- Ilgili dosyalar:
  - `app/page.tsx`
  - `app/servisler/page.tsx`
  - `app/servisler/yeni/page.tsx`
  - `app/servisler/[id]/duzenle/page.tsx`
  - `app/servisler/[id]/page.tsx`
  - `components/services/data-table.tsx`
- Acceptance checklist:
  - [x] Ana sayfa aciklamalari tek satirlik, gorev odakli metinlere indirildi.
  - [x] Uzun paragraf yerine kisa durum metinleri kullanildi.
  - [x] Gerekli aciklayici metinler icin tooltip (`title`) / drawer aciklamasi eklendi.
- Test notu:
  - Manuel: Header aciklamalari ve filtre aciklama metinleri okunabilirlik acisindan gozden gecirildi.

## WO-101 - Liste: URL persist search + status chips
- Ilgili dosyalar:
  - `lib/servisler/filter-state.ts`
  - `lib/servisler/filter-url.ts`
  - `app/api/services/route.ts`
  - `components/services/types.ts`
  - `components/services/columns.tsx`
  - `components/services/data-table-toolbar.tsx`
  - `components/services/data-table.tsx`
  - `app/servisler/page.tsx`
- Acceptance checklist:
  - [x] Arama `q=` query param ile URL'e yaziliyor/okunuyor.
  - [x] Durum chip secimi tek tikla uygulanip `status=` query paramina yansiyor.
  - [x] Kolonlar backlogtaki listeye gore guncellendi: Tekne, Baslik/Ozet, Durum, Oncelik, Lokasyon, Atanan, Tarih.
  - [x] Refresh sonrasi filtreler URL'den geri yukleniyor.
- Test notu:
  - Manuel: `q` + `status` ile filtre uygulanip refresh sonrasi durumun korundugu dogrulandi.

## WO-102 - Filter Drawer + Saved Views
- Ilgili dosyalar:
  - `components/services/data-table.tsx`
  - `components/services/data-table-toolbar.tsx`
  - `components/services/types.ts`
  - `lib/servisler/filter-state.ts`
  - `lib/servisler/filter-url.ts`
- Acceptance checklist:
  - [x] Drawer filtreleri eklendi: tarih araligi, tekne, lokasyon, teknisyen, oncelik, blokaj nedeni.
  - [x] `Uygula` ile filtreler aktif duruma ve URL state'ine yaziliyor.
  - [x] `Temizle` drawer filtrelerini sifirliyor.
  - [x] Saved view secenekleri uygulandi: Bugun Planlanacak, Blokajli, Onay Bekleyen, Parca Bekleyen.
  - [x] Drawer kapaliyken toolbar temiz ve hizli kullanim odakli kaldirildi.
- Test notu:
  - Manuel: Her saved view secildi, URL ve tablo sonucunun preset ile uyumlu oldugu kontrol edildi.

## WO-103 - Bulk actions bar (toplu islem)
- Ilgili dosyalar:
  - `components/services/data-table.tsx`
  - `playwright/tests/integration/work-order-bulk-actions.spec.ts`
- Acceptance checklist:
  - [x] Satir secimi ve toplu islem bari aktif secim adedini gosteriyor.
  - [x] En az 10 is emrinde toplu durum guncelleme calisiyor.
  - [x] En az 10 is emrinde toplu teknisyen atama calisiyor.
  - [x] Toplu islemler mevcut servis PATCH akislarini kullandigi icin audit log uretiliyor.
- Test notu:
  - Otomasyon: `work-order-bulk-actions.spec.ts` 10 kayit secip toplu durum + toplu teknisyen atama akislarini API dogrulamasiyla test ediyor.

## WO-104 - Liste performans + pagination
- Ilgili dosyalar:
  - `app/servisler/page.tsx`
  - `components/services/data-table.tsx`
  - `components/services/types.ts`
  - `lib/servisler/filter-url.ts`
  - `docs/wo-104-index-notes.md`
- Acceptance checklist:
  - [x] Servis listesi sorgusu server-side pagination (`page`, `limit`) ile calisiyor.
  - [x] Arama degisikligi URL senkronunda debounce ile calisiyor (her tus vurusunda navigation yok).
  - [x] Alt pagination kontrolu server-side next/prev + page-size secimi ile URL'e yaziliyor.
  - [x] Index onerileri dokumante edildi (`docs/wo-104-index-notes.md`).
- Test notu:
  - Otomasyon: `filter-workflow.spec.ts` ve `deployment-smoke.spec.ts` senaryolari server-side pagination degisikliginden sonra gecti.

## WO-201 - Detay bilgi hiyerarsisi + tab yapisi
- Ilgili dosyalar:
  - `app/servisler/[id]/page.tsx`
  - `components/services/work-order-detail-view.tsx`
  - `app/services/[id]/page.tsx`
- Acceptance checklist:
  - [x] Header'da tekne, is no, durum, oncelik, lokasyon, tarih gosteriliyor.
  - [x] Tab yapisi eklendi: Genel, Plan / Checklist, Notlar & Ekler, Gecmis.
  - [x] Right rail hizli aksiyon alani eklendi.
  - [x] Gecmis tab'i audit timeline verisini listeliyor.
- Test notu:
  - Manuel: Liste -> Detay gecisi ve sekme iceriklerinin veriyle doldugu dogrulandi.

## WO-202 - Ofis aksiyonlari (atama/planlama/blokaj/kapanis)
- Ilgili dosyalar:
  - `components/services/work-order-detail-view.tsx`
- Acceptance checklist:
  - [x] Teknisyen atama modal'i eklendi.
  - [x] Planlama (tarih/saat) modal'i eklendi.
  - [x] Blokaj nedeni secimi zorunlu kilindi.
  - [x] Is emri kapatma akisi required checklist alanlariyla eklendi.
  - [x] Aksiyonlar tek bolgede (right rail) toplandi.
- Test notu:
  - Manuel: Blokaj nedeni secilmeden kayit denemesi yapilarak kuralin engelledigi dogrulandi.

## WO-203 - Attachments & notes standardi
- Ilgili dosyalar:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260220113000_add_service_notes_attachments/migration.sql`
  - `app/api/services/[id]/notes/route.ts`
  - `app/api/services/[id]/attachments/route.ts`
  - `app/api/services/[id]/attachments/[attachmentId]/route.ts`
  - `app/servisler/[id]/page.tsx`
  - `components/services/work-order-detail-view.tsx`
  - `playwright/tests/integration/work-order-notes-attachments.spec.ts`
- Acceptance checklist:
  - [x] Notlar basit metin + timestamp seklinde kaydediliyor.
  - [x] Ek dosya yukleme, listeleme ve indirme akislari eklendi.
  - [x] Ek silme islemi role baglandi (`ADMIN`).
  - [x] Notlar & Ekler sekmesi gercek API ile calisir hale getirildi.
- Test notu:
  - Otomasyon: `work-order-notes-attachments.spec.ts` not ekleme, dosya yukleme/indirme ve `YETKILI` rolu icin silme yetkisinin engellendigini dogruluyor.

## DB-301 - Dashboard Operasyon sekmesi (default)
- Ilgili dosyalar:
  - `app/page.tsx`
  - `components/ui/page-states.tsx`
- Acceptance checklist:
  - [x] Dashboard default'ta Operasyon sekmesi dolu ve sade.
  - [x] KPI row 4 odak metrikle sinirlandi.
  - [x] Today Queue listeleri (Planlanacaklar, Blokajlilar) eklendi.
  - [x] Technician summary karti eklendi.
  - [x] Liste satirlarindaki `Ac` aksiyonu detay sayfasina gidiyor.
- Test notu:
  - Manuel: Dashboard'dan `Ac` ile `/servisler/[id]` rotasina gecis dogrulandi.

## DB-302 - Dashboard Analitik sekmesi (grafikler)
- Ilgili dosyalar:
  - `app/page.tsx`
  - `app/api/dashboard-stats/route.ts`
  - `lib/api/dashboard-service.ts`
  - `playwright/tests/integration/dashboard-analytics-quality.spec.ts`
- Acceptance checklist:
  - [x] Analitik sekmesi dashboard operasyonundan ayrildi.
  - [x] Grafikler (planlanmamis trend, lokasyon dagilimi, durum akis grafiği) Analitik sekmesine tasindi.
  - [x] Tarih araligi filtresi eklendi (`Son 7 Gun`, `Son 30 Gun`, `Son 90 Gun`).
  - [x] `range` secimi dashboard API'sine yansitildi.
- Test notu:
  - Otomasyon: `dashboard-analytics-quality.spec.ts` Analitik sekmesinde range filtrelerinin API cagrisiyla calistigini dogruluyor.

## DB-303 - Dashboard Kalite sekmesi (puan/performans)
- Ilgili dosyalar:
  - `app/page.tsx`
  - `lib/api/dashboard-service.ts`
  - `playwright/tests/integration/dashboard-analytics-quality.spec.ts`
- Acceptance checklist:
  - [x] Kalite sekmesinde `Top Performers` listesi eklendi.
  - [x] Kalite sekmesinde `Low Performers` listesi eklendi.
  - [x] Kalite puan trendi mini grafik olarak eklendi.
  - [x] Kalite metrikleri secili `range` filtresi ile hesaplanir hale getirildi.
- Test notu:
  - Otomasyon: `dashboard-analytics-quality.spec.ts` Kalite sekmesine gecis ve range filtre cagrilarini dogruluyor.

## CAL-401 - Takvim sayfasi aktivasyonu (teknisyen bazli resource gorunumu)
- Ilgili dosyalar:
  - `app/takvim/page.tsx`
  - `components/takvim/dispatch-planning-board.tsx`
  - `components/Sidebar.tsx`
  - `components/Header.tsx`
  - `app/operasyon/page.tsx`
- Acceptance checklist:
  - [x] `/takvim` rotasi redirect yerine aktif planlama sayfasi olarak acildi.
  - [x] Takvim gridi teknisyen bazli resource lane mantigiyla kurgulandi.
  - [x] Gun / Hafta toggle eklendi.
  - [x] Takvim kartina tiklayinca hizli detay modal'i aciliyor.
- Test notu:
  - Otomasyon: `/takvim` acilisi ve temel akis `playwright/tests/integration/calendar-dispatch.spec.ts` ile dogrulandi.

## CAL-402 - Unscheduled panel + drag-drop planlama
- Ilgili dosyalar:
  - `components/takvim/dispatch-planning-board.tsx`
  - `playwright/tests/integration/calendar-dispatch.spec.ts`
- Acceptance checklist:
  - [x] Sol panelde planlanmamis isler listesi eklendi.
  - [x] Sol panelde arama ve lokasyon filtresi eklendi.
  - [x] Planlanmamis kart surukle-birak ile takvim hucresine birakilinca planlama olusuyor.
  - [x] Birakma aksiyonu servis tarihini guncelliyor, teknisyen lane'ine birakildiginda atama listesine teknisyen ekleniyor.
  - [x] Planlama sonrasi liste ve takvim verisi yenileniyor.
- Test notu:
  - Otomasyon: `calendar-dispatch.spec.ts` testi planlanmamis bir kaydi olusturup drag-drop ile planlama akisinin tamamlandigini dogruluyor.

## CAL-403 - Kapasite gorunumu (hafif)
- Ilgili dosyalar:
  - `components/takvim/dispatch-planning-board.tsx`
  - `playwright/tests/integration/calendar-dispatch.spec.ts`
- Acceptance checklist:
  - [x] Resource lane basliklarina gorunur aralik icin toplam is adedi eklendi.
  - [x] Saat bilgisi varsa lane bazli toplama dahil edildi, yoksa `-` gosterildi.
  - [x] Gorunum hesaplamasi gun/hafta toggle secimine gore dinamik calisiyor.
- Test notu:
  - Otomasyon: `calendar-dispatch.spec.ts` lane kapasite satirinin (`Is:`) gorundugunu ve drag-drop planlama akisini birlikte dogruluyor.

## ADM-701 - Sozlukler: Durumlar / Lokasyonlar / Blokaj Nedenleri
- Ilgili dosyalar:
  - `app/api/admin/durumlar/route.ts`
  - `app/api/admin/durumlar/[id]/route.ts`
  - `app/api/admin/konumlar/route.ts`
  - `app/api/admin/konumlar/[id]/route.ts`
  - `app/api/admin/blokaj-nedenleri/route.ts`
  - `app/api/admin/blokaj-nedenleri/[id]/route.ts`
  - `app/api/dictionaries/work-order/route.ts`
  - `components/forms/service-form.tsx`
  - `components/services/data-table.tsx`
  - `playwright/tests/integration/admin-dictionaries.spec.ts`
- Acceptance checklist:
  - [x] Durum, konum ve blokaj nedeni sozlukleri API uzerinden CRUD olarak yonetilebilir.
  - [x] Is emri formu durum/lokasyon seceneklerini sozluk endpointinden alir.
  - [x] Is emri liste filtreleri lokasyon ve blokaj nedeni seceneklerini sozluk endpointinden alir.
  - [x] Yeni eklenen durum/lokasyon/blokaj nedeni kayitlari ofis ekranlarina yansir.
- Test notu:
  - Otomasyon: `admin-dictionaries.spec.ts` yeni sozluk kayitlarini olusturup `/servisler/yeni` ve `/servisler` filtrelerinde gorundugunu dogruluyor.

## ADM-702 - Puanlama kurallari yonetimi
- Ilgili dosyalar:
  - `app/api/admin/puanlama-agirlik/route.ts`
  - `app/api/services/[id]/complete/route.ts`
  - `playwright/tests/integration/admin-scoring-rules.spec.ts`
- Acceptance checklist:
  - [x] Puanlama katsayi endpointi admin rolunde whitelist bagimsiz olarak yonetilebilir hale getirildi.
  - [x] Servis kapanis akisi `zorluk_katsayi` tablosundaki aktif carpan degerini kullanir hale getirildi.
  - [x] Hesaplanan carpan `ServisPuan.savedMultiplierId` ile birlikte kayit aninda saklanir hale getirildi.
  - [x] Katsayi degisikligi sonrasi yeni kapanislarda guncel carpanin kullanildigi otomasyonla dogrulandi.
- Test notu:
  - Otomasyon: `admin-scoring-rules.spec.ts` PAKET carpanini guncelleyip yeni kapanista API donusundeki `zorlukCarpani` degerinin guncel ayara esit oldugunu dogruluyor.

## ADM-703 - Rol bazli yetkiler (basit RBAC)
- Ilgili dosyalar:
  - `middleware.ts`
  - `app/api/settings/route.ts`
  - `components/Sidebar.tsx`
  - `components/Header.tsx`
  - `playwright/tests/integration/admin-rbac.spec.ts`
- Acceptance checklist:
  - [x] `Ayarlar` rotasi middleware seviyesinde sadece `ADMIN` rolune acik hale getirildi.
  - [x] `GET /api/settings` endpointi sadece `ADMIN` rolunu kabul edecek sekilde sinirlandi.
  - [x] Sidebar ve Header uzerindeki Ayarlar linkleri sadece admin kullanicilara gosterilir hale getirildi.
  - [x] Servis silme isleminin admin disi rolde engellendigi entegrasyon testi ile dogrulandi.
- Test notu:
  - Otomasyon: `admin-rbac.spec.ts` YETKILI rolunun `/ayarlar` rotasina erisemeyip `DELETE /api/services/[id]` cagrilarinda `403` aldigini dogruluyor.

## BOAT-501 - Tekne listesi (arama + temel filtre + pagination)
- Ilgili dosyalar:
  - `app/tekneler/page.tsx`
  - `components/Sidebar.tsx`
  - `components/Header.tsx`
- Acceptance checklist:
  - [x] Tekne listesi sayfasi eklendi (`/tekneler`).
  - [x] Arama eklendi (tekne, marka, model, seri no, adres).
  - [x] Temel lokasyon filtresi eklendi (Tum, Yatmarin, Netsel, Dis Servis).
  - [x] Pagination eklendi (sayfa/ileri-geri).
  - [x] Kolonlar backlog ile hizalandi: Tekne adi, Lokasyon, Son servis, Acik is sayisi.
- Test notu:
  - Otomasyon: `boats-profile.spec.ts` listede olusan tekneyi bulup profile acis adimini dogruluyor.

## BOAT-502 - Tekne profil sayfasi (ozet + acik isler + gecmis)
- Ilgili dosyalar:
  - `app/tekneler/[id]/page.tsx`
  - `playwright/tests/integration/boats-profile.spec.ts`
  - `components/Header.tsx`
- Acceptance checklist:
  - [x] Tekne profil sayfasi eklendi (`/tekneler/[id]`).
  - [x] Summary card eklendi (kimlik/lokasyon/son servis + ozet metrikler).
  - [x] Acik isler mini listesi eklendi.
  - [x] Servis gecmisi listesi pagination ile eklendi.
  - [x] Tekne profilinden is emri detayina tek tik gecis saglandi.
- Test notu:
  - Otomasyon: `boats-profile.spec.ts` profilde acik is satirindan `/servisler/[id]` sayfasina gecisi dogruluyor.

## TEAM-601 - Personel listesi (durum + acik is sayisi)
- Ilgili dosyalar:
  - `app/personel/page.tsx`
  - `app/api/personel/route.ts`
  - `components/forms/service-form.tsx`
- Acceptance checklist:
  - [x] Personel listesi tablo gorunumu backlog kolonlariyla hizalandi: Isim, Rol, Acik Is Sayisi, Guncel Durum.
  - [x] Listeye arama, rol filtresi ve pagination eklendi.
  - [x] Personel API yanitina `aktifIsSayisi` ve `guncelDurum` alanlari eklendi.
  - [x] Servis atama alaninda personel yuk bilgisi (acik is + durum) gosterilmeye baslandi.
- Test notu:
  - Otomasyon: `personnel-profile.spec.ts` listede personel satirini ve profile gecisi dogruluyor.

## TEAM-602 - Personel profil (acik isler + puan ozeti)
- Ilgili dosyalar:
  - `app/personel/[id]/page.tsx`
  - `app/api/services/route.ts`
  - `components/Header.tsx`
  - `playwright/tests/integration/personnel-profile.spec.ts`
- Acceptance checklist:
  - [x] Personel profil ekraninda puan ozeti bolumu netlestirildi.
  - [x] Acik is emri listesi personel filtreli servis sorgusuyla baglandi.
  - [x] Acik is listesinden is emri detayina tek tik gecis saglandi.
  - [x] `services` API'sine `personelId` filtre destegi eklendi.
- Test notu:
  - Otomasyon: `personnel-profile.spec.ts` profilde acik is kaydindan `/servisler/[id]` detayina gecisi dogruluyor.

## INT-801 - Google Sheets sync paneli (manual + schedule)
- Ilgili dosyalar:
  - `app/ayarlar/page.tsx`
  - `app/api/sync/status/route.ts`
  - `app/api/sync/route.ts`
- Acceptance checklist:
  - [x] Sync status + son calisma ozeti Ayarlar > Google Sheets Sync sekmesine eklendi.
  - [x] Manual trigger aksiyonlari eklendi (`Incremental Sync`, `Full Reset`, `Sheet-DB Validate`).
  - [x] Cron/schedule ayarlari (`cronExpression`, `timezone`, stale threshold) panelden yonetilebilir hale getirildi.
  - [x] Son sync loglari tablo halinde goruntulenebilir oldu.
- Test notu:
  - Manuel: Ayarlar sayfasinda sync kontrol merkezi, log tablosu ve cron health rozetleri dogrulandi.

## INT-802 - WhatsApp kapanis rapor sablonlari (metin uretimi)
- Ilgili dosyalar:
  - `app/raporlar/whatsapp/page.tsx`
  - `components/services/work-order-detail-view.tsx`
  - `components/services/data-table.tsx`
  - `components/forms/service-form.tsx`
  - `playwright/tests/integration/whatsapp-template.spec.ts`
- Acceptance checklist:
  - [x] Kapanis rapor sablon editoru eklendi (`{{boat}}`, `{{date}}`, `{{summary}}`, `{{technician}}`).
  - [x] Secili kapanmis servis icin anlik preview ve kopyalama akisi eklendi.
  - [x] Kapanis/puanlama basarisindan sonra kullaniciya sablon ekranina gecis aksiyonu eklendi (`/raporlar/whatsapp?serviceId=...`).
  - [x] `serviceId` query param ile hedef servis otomatik secilip metin uretiliyor.
- Test notu:
  - Otomasyon: `whatsapp-template.spec.ts` kapanan servis uzerinden sablon preview degiskenlerinin dogru dolduruldugunu dogruluyor.

## OPS-901 - Backup job + retention + restore doc
- Ilgili dosyalar:
  - `lib/backup/index.ts`
  - `lib/backup/scheduler.ts`
  - `app/api/cron/backup/route.ts`
  - `docs/backup-restore-runbook.md`
  - `playwright/tests/backup/creation.spec.ts`
  - `playwright/tests/backup/scheduling.spec.ts`
  - `playwright/tests/backup/restore.spec.ts`
- Acceptance checklist:
  - [x] Scheduled backup endpoint (`/api/cron/backup`) otomatik yedek olusturuyor.
  - [x] Retention politikasi uygulanabilir durumda (`daily_weekly` ve `legacy_days`).
  - [x] Yedek dosya isimleri standartta (`servicepro-manual-*`, `servicepro-auto-*`).
  - [x] Restore adimlari runbook ile dokumante edildi.
- Test notu:
  - Otomasyon: `backup/creation.spec.ts`, `backup/scheduling.spec.ts`, `backup/restore.spec.ts` yedek olusturma-retention-restore akislarini dogruluyor.

## OPS-902 - Health endpoint + smoke test
- Ilgili dosyalar:
  - `app/api/health/route.ts`
  - `app/health/route.ts`
  - `middleware.ts`
  - `playwright/tests/integration/deployment-smoke.spec.ts`
- Acceptance checklist:
  - [x] `GET /health` endpoint eklendi.
  - [x] Cevapta `status`, `db`, `version`, `time` alanlari donuyor.
  - [x] Middleware'de `/health` public route olarak acildi.
  - [x] Smoke test login -> servis listesi -> servis detayi akisini dogruluyor.
- Test notu:
  - Otomasyon: `deployment-smoke.spec.ts` health + kritik akis smoke kontrolu yapiyor.

## SEC-1001 - Session hardening plani + hizli kazanimlar
- Ilgili dosyalar:
  - `middleware.ts`
  - `SECURITY.md`
- Acceptance checklist:
  - [x] Repo seviyesinde session hardening plani dokumante edildi (`SECURITY.md`).
  - [x] Minimum CSP onerisi ve header stratejisi dokumana eklendi.
  - [x] Kisa vadeli hizli kazanım olarak temel security header'lari middleware'e eklendi.
  - [x] Orta vadeli `httpOnly` cookie migration fazlari netlestirildi.
- Test notu:
  - Manuel + smoke: middleware header degisikligi sonrasi login, liste ve detay akislari smoke test ile dogrulandi.

## Calistirilan dogrulamalar
- `npm run typecheck` ✅
- `npm run test:unit` ✅
- `npm test` ✅
- `npm run lint` ⚠️ (Bu P0 kapsami disinda kalan mevcut unused-var hatalari devam ediyor)

## Sprint 5 dogrulamalari
- `npm run typecheck` ✅
- `npx next lint --file app/takvim/page.tsx --file components/takvim/dispatch-planning-board.tsx --file components/Sidebar.tsx --file components/Header.tsx --file app/operasyon/page.tsx` ✅
- `npx next lint --file playwright/tests/integration/calendar-dispatch.spec.ts --file components/takvim/dispatch-planning-board.tsx --file app/takvim/page.tsx --file components/Sidebar.tsx --file components/Header.tsx` ✅
- `npx playwright test playwright/tests/integration/calendar-dispatch.spec.ts --project=chromium --reporter=line --timeout=180000` ✅
- `npx playwright test playwright/tests/integration/deployment-smoke.spec.ts --project=chromium --reporter=line --timeout=180000` ✅
- `npm test` ✅

## Sprint 6+ (BOAT) dogrulamalari
- `npm run typecheck` ✅
- `npx next lint --file app/tekneler/page.tsx --file app/tekneler/[id]/page.tsx --file components/Sidebar.tsx --file components/Header.tsx --file playwright/tests/integration/boats-profile.spec.ts` ✅
- `npx playwright test playwright/tests/integration/boats-profile.spec.ts --project=chromium --reporter=line --timeout=180000` ✅
- `npm test` ✅

## Sprint 6+ (TEAM) dogrulamalari
- `npm run typecheck` ✅
- `npx next lint --file app/personel/page.tsx --file app/personel/[id]/page.tsx --file app/api/personel/route.ts --file app/api/services/route.ts --file components/forms/service-form.tsx --file components/Header.tsx --file playwright/tests/integration/personnel-profile.spec.ts` ✅
- `npx playwright test playwright/tests/integration/personnel-profile.spec.ts --project=chromium --reporter=line --timeout=180000` ✅
- `npx playwright test playwright/tests/personel/name-edit.spec.ts --project=chromium --reporter=line --timeout=180000` ✅
- `npm test` ✅

## Sprint 6+ (INT) dogrulamalari
- `npm run typecheck` ✅
- `npx next lint --file app/raporlar/whatsapp/page.tsx --file components/services/work-order-detail-view.tsx --file components/services/data-table.tsx --file components/forms/service-form.tsx --file playwright/tests/integration/whatsapp-template.spec.ts` ✅
- `npx playwright test playwright/tests/integration/whatsapp-template.spec.ts --project=chromium --reporter=line --timeout=180000` ✅

## Sprint 4 (OPS) dogrulamalari
- `npx playwright test playwright/tests/backup/creation.spec.ts playwright/tests/backup/scheduling.spec.ts playwright/tests/backup/restore.spec.ts --project=chromium --reporter=line --timeout=240000` ✅

## Sprint 6+ (SEC) dogrulamalari
- `npm run typecheck` ✅
- `npx next lint --file middleware.ts` ✅
- `npx playwright test playwright/tests/integration/deployment-smoke.spec.ts --project=chromium --reporter=line --timeout=180000` ✅

## Sprint 2+ (WO-104) dogrulamalari
- `npm run typecheck` ✅
- `npx next lint --file app/servisler/page.tsx --file components/services/data-table.tsx --file components/services/types.ts --file lib/servisler/filter-url.ts` ✅
- `npx playwright test playwright/tests/integration/filter-workflow.spec.ts playwright/tests/integration/deployment-smoke.spec.ts --project=chromium --reporter=line --timeout=240000` ✅

## Sprint 3+ (WO-103) dogrulamalari
- `npm run typecheck` ✅
- `npx next lint --file components/services/data-table.tsx --file playwright/tests/integration/work-order-bulk-actions.spec.ts` ✅
- `npx playwright test playwright/tests/integration/work-order-bulk-actions.spec.ts --project=chromium --reporter=line --timeout=240000` ✅

## Sprint 7 (WO-203) dogrulamalari
- `npm run typecheck` ✅
- `npx next lint --file app/api/services/[id]/notes/route.ts --file app/api/services/[id]/attachments/route.ts --file app/api/services/[id]/attachments/[attachmentId]/route.ts --file app/servisler/[id]/page.tsx --file components/services/work-order-detail-view.tsx --file playwright/tests/integration/work-order-notes-attachments.spec.ts` ✅
- `npx playwright test playwright/tests/integration/work-order-notes-attachments.spec.ts --project=chromium --reporter=line --timeout=240000` ✅

## Sprint 8 (DB-302/DB-303) dogrulamalari
- `npm run typecheck` ✅
- `npx next lint --file app/page.tsx --file app/api/dashboard-stats/route.ts --file lib/api/dashboard-service.ts --file components/layout/page-content.tsx --file playwright/tests/integration/dashboard-analytics-quality.spec.ts` ✅
- `npx playwright test playwright/tests/integration/dashboard-analytics-quality.spec.ts --project=chromium --reporter=line --timeout=240000` ✅

## Sprint 9 (CAL-403) dogrulamalari
- `npm run typecheck` ✅
- `npx next lint --file components/takvim/dispatch-planning-board.tsx --file playwright/tests/integration/calendar-dispatch.spec.ts` ✅
- `npx playwright test playwright/tests/integration/calendar-dispatch.spec.ts --project=chromium --reporter=line --timeout=240000` ✅

## Sprint 10 (ADM-701) dogrulamalari
- `npm run typecheck` ✅
- `npx next lint --file playwright/tests/integration/admin-dictionaries.spec.ts` ✅
- `npx playwright test playwright/tests/integration/admin-dictionaries.spec.ts --project=chromium --reporter=line --timeout=240000` ✅

## Sprint 11 (ADM-703) dogrulamalari
- `npm run typecheck` ✅
- `npx next lint --file middleware.ts --file app/api/settings/route.ts --file components/Sidebar.tsx --file components/Header.tsx --file playwright/tests/integration/admin-rbac.spec.ts` ✅
- `npx playwright test playwright/tests/integration/admin-rbac.spec.ts --project=chromium --reporter=line --timeout=240000` ✅

## Sprint 12 (ADM-702) dogrulamalari
- `npm run typecheck` ✅
- `npx next lint --file app/api/admin/puanlama-agirlik/route.ts --file app/api/services/[id]/complete/route.ts --file playwright/tests/integration/admin-scoring-rules.spec.ts` ✅
- `npx playwright test playwright/tests/integration/admin-scoring-rules.spec.ts --project=chromium --reporter=line --timeout=240000` ✅

## Sprint 0 (STP-FOUND) - Foundation (ServiceTitan pattern)
- Ilgili dosyalar:
  - `app/api/jobs/route.ts`
  - `app/api/jobs/[id]/route.ts`
  - `app/api/jobs/[id]/complete/route.ts`
  - `app/jobs/page.tsx`
  - `app/jobs/[id]/page.tsx`
  - `app/jobs/[id]/edit/page.tsx`
  - `app/jobs/yeni/page.tsx`
  - `app/dispatch/page.tsx`
  - `lib/audit/events.ts`
  - `components/ui/ui-redesign-provider.tsx`
  - `app/globals.css`
  - `prisma/seed.ts`
- Acceptance checklist:
  - [x] `Service = Job` alias namespace ile `/api/jobs` route katmani eklendi.
  - [x] `Job`/`Appointment` audit event standardi (`lib/audit/events.ts`) eklendi.
  - [x] Seed veri seti en az 10 job + 15 appointment olacak sekilde guncellendi.
  - [x] High-density mode default ve glass efektleri ofis kullanimina uygun sade hale getirildi.
  - [x] `/jobs` ve `/dispatch` rotalari aktif namespace olarak acildi.
- Test notu:
  - Otomasyon: `npm run typecheck`, `npx next lint --file components/Header.tsx --file app/jobs/yeni/page.tsx`.

## Sprint 1 (STP-JA) - Job + Appointment
- Ilgili dosyalar:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260220153000_add_job_appointments_foundation/migration.sql`
  - `lib/jobs/appointments.ts`
  - `lib/timezone.ts`
  - `app/api/jobs/[id]/appointments/route.ts`
  - `app/api/appointments/[id]/route.ts`
  - `app/api/appointments/[id]/confirm/route.ts`
  - `app/api/dispatch/day/route.ts`
  - `app/api/dispatch/week/route.ts`
  - `components/appointments/appointments-tab.tsx`
  - `components/services/work-order-detail-view.tsx`
  - `playwright/tests/integration/jobs-appointments.spec.ts`
  - `scripts/backfill-job-appointments.ts`
- Acceptance checklist:
  - [x] Appointment model + relation + indexler migration ile eklendi.
  - [x] Job detail icinde Appointments sekmesi (create/edit/delete/confirm) eklendi.
  - [x] Appointment overlap backend'de kesin, UI'da optimistic rollback + toast ile ele aliniyor.
  - [x] Job booking API tek transaction ile `job + firstAppointment` olusturuyor.
  - [x] Confirm/unconfirm akisinda `confirmedAt`/`confirmedBy` ve audit event yaziliyor.
  - [x] TR timezone input/output + DB UTC akisi utility katmaninda standardize edildi.
  - [x] Legacy `Service.tarih/saat -> first appointment` backfill scripti eklendi.
- Test notu:
  - `npx prisma migrate deploy` ✅
  - `npm run typecheck` ✅
  - `npx next lint --file scripts/backfill-job-appointments.ts --file components/Header.tsx --file app/jobs/yeni/page.tsx` ✅
- `npm run jobs:backfill-appointments:dry -- --limit=3` ✅
- `npx playwright test playwright/tests/integration/jobs-appointments.spec.ts --project=chromium --reporter=line --timeout=240000` ✅

## Sprint 2 (STP-DB) - Dispatch Board
- Ilgili dosyalar:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260220194000_add_dispatch_preference/migration.sql`
  - `app/api/dispatch/day/route.ts`
  - `app/api/dispatch/week/route.ts`
  - `app/api/dispatch/move/route.ts`
  - `app/api/dispatch/lock/route.ts`
  - `app/api/dispatch/unlock/route.ts`
  - `app/api/dispatch/preferences/route.ts`
  - `app/dispatch/page.tsx`
  - `components/dispatch/DispatchBoard.tsx`
  - `components/dispatch/DispatchToolbar.tsx`
  - `components/dispatch/DispatchFilters.tsx`
  - `components/dispatch/TechnicianLane.tsx`
  - `components/dispatch/AppointmentCard.tsx`
  - `components/dispatch/JobTray.tsx`
  - `components/dispatch/ConflictDialog.tsx`
  - `playwright/tests/integration/dispatch-board.spec.ts`
- Acceptance checklist:
  - [x] `/dispatch` day/week gorunumu appointment tabanli board olarak aktiflestirildi.
  - [x] Job tray (unassigned appointment listesi) eklendi.
  - [x] Drag-drop ile appointment lane/day tasima akisi eklendi.
  - [x] Backend move endpoint conflict kontrolu yapiyor, hata durumunda UI rollback + toast calisiyor.
  - [x] Lock/unlock endpoint ve UI aksiyonlari eklendi; kilitli appointment drag/resize bloklaniyor.
  - [x] Week capacity warning (8 saat ustu lane-day) gorunumu eklendi.
  - [x] User bazli dispatch preference endpointi eklendi (`view`, `yogunMod`, `shownPersonelIds`).
  - [x] Day/week endpointlerine `konum`, `durum`, `confirmed/unconfirmed`, `personelId` filtreleri eklendi.
- Test notu:
  - `npx prisma migrate deploy` ✅
  - `npm run db:generate` ✅
  - `npm run typecheck` ✅
  - `npx next lint --file app/api/dispatch/day/route.ts --file app/api/dispatch/week/route.ts --file app/api/dispatch/move/route.ts --file app/api/dispatch/lock/route.ts --file app/api/dispatch/unlock/route.ts --file app/api/dispatch/preferences/route.ts --file app/dispatch/page.tsx --file components/dispatch/DispatchBoard.tsx --file components/dispatch/DispatchToolbar.tsx --file components/dispatch/DispatchFilters.tsx --file components/dispatch/TechnicianLane.tsx --file components/dispatch/JobTray.tsx --file components/dispatch/AppointmentCard.tsx --file components/dispatch/ConflictDialog.tsx --file playwright/tests/integration/dispatch-board.spec.ts` ✅
  - `npx playwright test playwright/tests/integration/dispatch-board.spec.ts --project=chromium --reporter=line --timeout=240000` ✅

## Sprint 3 (STP-CB) - Call Booking / Leads
- Ilgili dosyalar:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260220213000_add_booking_lead_foundation/migration.sql`
  - `app/api/bookings/route.ts`
  - `app/api/bookings/[id]/route.ts`
  - `app/api/bookings/[id]/convert-to-job/route.ts`
  - `app/api/bookings/[id]/convert-to-lead/route.ts`
  - `app/api/bookings/[id]/dismiss/route.ts`
  - `app/api/leads/route.ts`
  - `app/api/leads/[id]/route.ts`
  - `app/api/leads/[id]/convert-to-job/route.ts`
  - `app/calls/page.tsx`
  - `app/calls/[id]/page.tsx`
  - `app/leads/page.tsx`
  - `app/leads/[id]/page.tsx`
  - `components/calls/CallsBoard.tsx`
  - `components/leads/LeadsBoard.tsx`
  - `playwright/tests/integration/calls-leads.spec.ts`
  - `types/call-booking.ts`
  - `lib/actions/service.ts`
  - `lib/audit/events.ts`
  - `components/Sidebar.tsx`
  - `components/Header.tsx`
- Acceptance checklist:
  - [x] `/calls` ekraninda booking listesi + durum filtreleme + hizli booking olusturma eklendi.
  - [x] Booking kaydindan `convert-to-job` transaction akisi eklendi (tekne resolve + job + first appointment + booking linkleme).
  - [x] Booking kaydindan `convert-to-lead` akisi eklendi, booking status ve lead baglantisi guncelleniyor.
  - [x] `/leads` pipeline ekraninda status degistirme, takip tarihi guncelleme ve overdue gorunumu eklendi.
  - [x] Lead kaydindan `convert-to-job` transaction akisi eklendi (appointment overlap backend kontrolu ile).
  - [x] Yeni booking/lead/convert akislari icin audit eventleri eklendi.
- Test notu:
  - `npx prisma migrate deploy` ✅
  - `npm run db:generate` ✅ (`PRISMA_CLIENT_ENGINE_TYPE=binary` ile)
  - `npm run typecheck` ✅
  - `npx next lint --file app/api/bookings/route.ts --file app/api/bookings/[id]/route.ts --file app/api/bookings/[id]/convert-to-job/route.ts --file app/api/bookings/[id]/convert-to-lead/route.ts --file app/api/bookings/[id]/dismiss/route.ts --file app/api/leads/route.ts --file app/api/leads/[id]/route.ts --file app/api/leads/[id]/convert-to-job/route.ts --file app/calls/page.tsx --file app/calls/[id]/page.tsx --file app/leads/page.tsx --file app/leads/[id]/page.tsx --file components/calls/CallsBoard.tsx --file components/leads/LeadsBoard.tsx --file components/Sidebar.tsx --file components/Header.tsx --file lib/actions/service.ts --file lib/audit/events.ts --file playwright/tests/integration/calls-leads.spec.ts` ✅
  - `npx playwright test playwright/tests/integration/calls-leads.spec.ts --project=chromium --reporter=line --timeout=240000` ✅

## Sprint 4 (STP-AN) - Alert Rules + Notification Center
- Ilgili dosyalar:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260220230000_add_alerts_notifications_foundation/migration.sql`
  - `lib/alerts/evaluator.ts`
  - `types/alerts.ts`
  - `lib/audit/events.ts`
  - `app/api/alerts/rules/route.ts`
  - `app/api/alerts/rules/[id]/route.ts`
  - `app/api/alerts/evaluate/route.ts`
  - `app/api/alerts/status/route.ts`
  - `app/api/notifications/route.ts`
  - `app/api/notifications/[id]/read/route.ts`
  - `app/api/notifications/[id]/archive/route.ts`
  - `app/api/notifications/read-all/route.ts`
  - `app/api/cron/alerts/route.ts`
  - `app/notifications/page.tsx`
  - `app/ayarlar/alerts/page.tsx`
  - `components/notifications/NotificationBell.tsx`
  - `components/notifications/NotificationCenter.tsx`
  - `components/alerts/AlertRulesTable.tsx`
  - `components/alerts/AlertRuleDialog.tsx`
  - `components/layout/page-header.tsx`
  - `components/Sidebar.tsx`
  - `app/ayarlar/page.tsx`
  - `middleware.ts`
- Acceptance checklist:
  - [x] Header tarafinda gerçek bildirim zili + unread badge eklendi.
  - [x] `/notifications` sayfasinda read/unread/archive aksiyonlari ve `read-all` toplu islemi eklendi.
  - [x] `/ayarlar/alerts` ekraninda alert rule CRUD akislari eklendi.
  - [x] Rule engine endpointleri eklendi: `POST /api/alerts/evaluate`, `GET /api/alerts/status`, `POST|GET /api/cron/alerts`.
  - [x] Rule tipleri eklendi: `APPOINTMENT_UNCONFIRMED_24H`, `LEAD_FOLLOWUP_OVERDUE`, `APPOINTMENT_OVERLAP_DETECTED`.
  - [x] Notification/Alert aksiyonlari icin audit eventleri eklendi.
- Test notu:
  - `npx prisma migrate deploy` ✅
  - `npm run db:generate` ✅
  - `npm run typecheck` ✅
  - `npx next lint --file app/api/alerts/rules/route.ts --file app/api/alerts/rules/[id]/route.ts --file app/api/alerts/evaluate/route.ts --file app/api/alerts/status/route.ts --file app/api/notifications/route.ts --file app/api/notifications/[id]/read/route.ts --file app/api/notifications/[id]/archive/route.ts --file app/api/notifications/read-all/route.ts --file app/api/cron/alerts/route.ts --file app/notifications/page.tsx --file app/ayarlar/alerts/page.tsx --file components/notifications/NotificationBell.tsx --file components/notifications/NotificationCenter.tsx --file components/alerts/AlertRuleDialog.tsx --file components/alerts/AlertRulesTable.tsx --file components/layout/page-header.tsx --file components/Sidebar.tsx --file app/ayarlar/page.tsx --file components/Header.tsx --file lib/alerts/evaluator.ts --file lib/audit/events.ts --file middleware.ts --file types/alerts.ts --file playwright/tests/integration/alerts-notifications.spec.ts` ✅
  - `npx playwright test playwright/tests/integration/alerts-notifications.spec.ts --project=chromium --reporter=line --timeout=240000` ✅

## Sprint 5 (STP-PT) - Pricebook-Lite + Templates
- Ilgili dosyalar:
  - `prisma/schema.prisma`
  - `prisma/migrations/20260221003000_add_pricebook_templates_foundation/migration.sql`
  - `types/pricebook.ts`
  - `lib/pricebook/shared.ts`
  - `lib/audit/events.ts`
  - `app/api/pricebook/categories/route.ts`
  - `app/api/pricebook/categories/[id]/route.ts`
  - `app/api/pricebook/items/route.ts`
  - `app/api/pricebook/items/[id]/route.ts`
  - `app/api/jobs/[id]/line-items/route.ts`
  - `app/api/line-items/[id]/route.ts`
  - `app/api/templates/jobs/route.ts`
  - `app/api/templates/jobs/[id]/route.ts`
  - `app/api/templates/jobs/[id]/apply-to-job/route.ts`
  - `app/api/templates/jobs/[id]/create-job/route.ts`
  - `app/jobs/[id]/page.tsx`
  - `app/pricebook/page.tsx`
  - `app/pricebook/items/page.tsx`
  - `app/pricebook/categories/page.tsx`
  - `app/templates/jobs/page.tsx`
  - `components/services/work-order-detail-view.tsx`
  - `components/jobs/job-detail/EstimateTab.tsx`
  - `components/pricebook/PricebookItemsTable.tsx`
  - `components/pricebook/PricebookCategoriesTable.tsx`
  - `components/templates/TemplateBuilder.tsx`
  - `components/templates/JobTemplatesTable.tsx`
  - `playwright/tests/integration/pricebook-templates.spec.ts`
- Acceptance checklist:
  - [x] Pricebook category ve item modelleri eklendi; API tarafinda CRUD endpointleri aktiflestirildi.
  - [x] Job detail ekranina `Estimate` sekmesi eklendi; line item ekleme/guncelleme/silme backend transaction + validation ile calisiyor.
  - [x] Template builder ve template listesi eklendi; template'i job'a uygulama ve template'ten yeni job olusturma endpointleri tamamlandi.
  - [x] Pricebook, line item ve template akislarina audit event standardi eklendi.
  - [x] `/api/services` geriye donuk uyumu korunurken yeni `/api/jobs` namespace'i estimate akisina entegre edildi.
  - [x] `pricebook` ve `templates/jobs` sayfalari sidebar/header navigasyonuna eklendi.
- Test notu:
  - `npm run typecheck` ✅
  - `npx next lint --file app/api/pricebook/categories/route.ts --file app/api/pricebook/categories/[id]/route.ts --file app/api/pricebook/items/route.ts --file app/api/pricebook/items/[id]/route.ts --file app/api/jobs/[id]/line-items/route.ts --file app/api/line-items/[id]/route.ts --file app/api/templates/jobs/route.ts --file app/api/templates/jobs/[id]/route.ts --file app/api/templates/jobs/[id]/apply-to-job/route.ts --file app/api/templates/jobs/[id]/create-job/route.ts --file app/jobs/[id]/page.tsx --file app/pricebook/page.tsx --file app/pricebook/items/page.tsx --file app/pricebook/categories/page.tsx --file app/templates/jobs/page.tsx --file components/services/work-order-detail-view.tsx --file components/jobs/job-detail/EstimateTab.tsx --file components/pricebook/PricebookItemsTable.tsx --file components/pricebook/PricebookCategoriesTable.tsx --file components/templates/JobTemplatesTable.tsx --file components/templates/TemplateBuilder.tsx --file playwright/tests/integration/pricebook-templates.spec.ts` ✅
  - `npx playwright test playwright/tests/integration/pricebook-templates.spec.ts --project=chromium --reporter=line --timeout=240000` ✅
