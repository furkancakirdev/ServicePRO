# ServicePro

ServicePro, tekne teknik servis operasyonlarını uçtan uca yöneten bir saha servis platformudur.  
Çalışan ekipleri, planlama, iş emri, performans, raporlama ve geri bildirim döngüsünde tek bir operasyon sistemine toplar.

## Neyi Çözüyor?

Sektörde sık görülen operasyonel boşluklar ve ServicePro karşılıkları:

| Sektörel Problem | ServicePro Çözümü | İş Etkisi |
| --- | --- | --- |
| Dağınık takip (Excel, WhatsApp, telefon, sözlü not) | Tek merkezde iş emri, çağrı, lead, randevu ve bildirim yönetimi | Kaçan iş ve bilgi kaybı azalır |
| Planlama kaosu ve çakışan ekip atamaları | Gün/hafta dispatch planlama, randevu kartları, kilitleme ve taşıma akışı | Saha verimliliği artar |
| Öznel personel değerlendirmesi | Ağırlıklı puanlama, yetkili/rol bazlı değerlendirme, aylık performans ve rozet raporları | Adil ve ölçülebilir performans yönetimi |
| Sheet ve sistem verisi arasında tutarsızlık | Validate, reconcile, strict kontrol ve cron tabanlı sync | Veri güvenilirliği yükselir |
| Servis kapanışında eksik kayıt | İş emri kapanış akışı, not/ek yönetimi, kalite takibi | Denetlenebilir ve standart operasyon |
| Operasyon görünürlüğünün zayıf olması | Dashboard, operasyon özeti, teknisyen durumu, alert ve bildirim sistemi | Yönetim hızlı karar alır |
| Olası veri kayıpları | Backup, restore, retention ve health kontrolleri | İş sürekliliği güçlenir |

## Öne Çıkan Özellikler

- JWT tabanlı kimlik doğrulama ve RBAC (ADMIN / YETKILI)
- Whitelist kontrollü yetkili yönetimi
- İş emri yaşam döngüsü: oluşturma, atama, ilerletme, kapatma
- Randevu ve dispatch: gün/hafta görünümü, personel bazlı planlama
- Çağrı/booking yönetimi ve lead’e veya job’a dönüştürme akışları
- Pricebook (kategori + kalem) ve iş şablonları
- Notlar, ekler ve servis detay geçmişi
- Aylık puanlama, performans raporu, rozet kazananlar
- Proaktif alert kuralları ve bildirim merkezi
- Google Sheets senkronizasyonu (manuel + cron + doğrulama araçları)
- Dashboard istatistikleri ve hava durumu entegrasyonu
- Yedekleme/geri yükleme API’leri ve operasyonel script seti

## Teknik Yığın

- Frontend: Next.js 14 (App Router), React 18, TypeScript
- UI: Ant Design + Pro Components, Radix UI, Tailwind CSS
- Backend: Next.js API Routes
- Veri Katmanı: PostgreSQL + Prisma
- Auth: JWT (`jose`, `jsonwebtoken`)
- Takvim/Planlama: FullCalendar
- Raporlama/Görselleştirme: Recharts
- Test: Playwright, smoke ve regression script’leri
- Dağıtım: Docker Compose (NAS), Vercel, GitHub Actions

## Modül Haritası

- `app/`: Sayfalar ve API route’ları
- `components/`: Domain bazlı UI bileşenleri
- `lib/`: İş kuralları, sync, auth, backup, yardımcı katmanlar
- `prisma/`: Şema, migration ve seed
- `scripts/`: Sync, doğrulama, bakım ve test script’leri
- `playwright/` ve `e2e/`: Uçtan uca test senaryoları
- `docs/`: Mimari, durum, rehber ve operasyon dokümanları

## Operasyon Akışı (Örnek)

1. Çağrı/booking kaydı alınır.
2. Booking lead’e veya doğrudan iş emrine dönüştürülür.
3. İş emri dispatch ekranında personel ve zaman ile planlanır.
4. Saha operasyonu tamamlanır, notlar/ekler girilir.
5. İş emri kapanışı ile puanlama ve performans verisi üretilir.
6. Dashboard, raporlar ve alert sistemi üzerinden yönetsel takip yapılır.

## Lisans

Bu depo kurum içi kullanım odaklıdır. Lisanslama ihtiyaçları proje sahibinin tasarrufundadır.
