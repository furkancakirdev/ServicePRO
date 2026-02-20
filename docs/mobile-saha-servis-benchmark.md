# Mobil Saha Servis Benchmark ve Yol Haritasi

## Amac
Teknisyenlerin telefondan servis raporu, malzeme kullanimi, fotograf yukleme ve durum guncellemesi yapabildigi; yetkili kontrol/puanlama adimlarini koruyan bir mobil cozum cizmek.

## Benchmark Kapsami
Incelenen ana cozum siniflari:
- Dynamics 365 Field Service Mobile
- Salesforce Field Service Mobile
- Oracle Field Service Mobility
- Simpro Mobile
- Housecall Pro Mobile
- Denizcilik odakli saha/servis yazilimlari (SeaHub, Sealogical benzeri)

## Ozellik Matrisi (Kisa)
| Yetkinlik | Dynamics 365 | Salesforce FS | Oracle FS | Simpro | Housecall Pro | Hedef ServicePro Mobil |
|---|---|---|---|---|---|---|
| Offline calisma | Var | Var | Var | Var | Kismi | Zorunlu |
| Is emri listesi | Var | Var | Var | Var | Var | Zorunlu |
| Is emri durum guncelleme | Var | Var | Var | Var | Var | Zorunlu |
| Fotograf/ek dosya | Var | Var | Var | Var | Var | Zorunlu |
| Malzeme/tuketim girisi | Var | Var | Var | Var | Var | Zorunlu |
| Rota/lokasyon odagi | Guclu | Guclu | Guclu | Orta | Orta | Orta-Guclu |
| Imza/form | Var | Var | Var | Var | Var | Faz-2 |
| Gelismis analitik | Guclu | Guclu | Guclu | Orta | Orta | Faz-3 |

## Denizcilik Sektorunde Fark Yaratan Noktalar
- Lokasyon dalgalanmasi: marina/dis servis, teknenin fiziksel yer degisikligi.
- Baglanti kalitesi: saha interneti zayif oldugu icin offline once tasarim zorunlu.
- Is kaniti: fotograf + aciklama + kullanilan malzeme + adam/saat izlenebilirligi.
- Yetki ayrimi: teknisyen ilerletir, yetkili kapanis/puanlama onayi verir.

## ServicePro Mobil MVP (Faz-1)
1. Giris ve rol dogrulama
- Teknisyen kendi is listesi
- Bugun / bu hafta / geciken / tarihsiz gorunumleri

2. Is Detay Ekrani
- Tekne, lokasyon, aciklama, planlanan tarih/saat
- Atanan ekip ve sorumlu rol gorunumu

3. Durum Guncelleme (teknisyen sinirli)
- `RANDEVU_VERILDI -> DEVAM_EDIYOR`
- `DEVAM_EDIYOR -> RAPOR_BEKLIYOR`
- `TAMAMLANDI` sadece yetkili onayi ile

4. Saha Raporlama
- Yapilan is aciklamasi
- Kullanilan malzeme satirlari (ad, miktar, birim)
- Harcanan sure (adam/saat)

5. Fotograf Yukleme
- Islem oncesi/sonrasi
- Offline kuyruga alinip baglanti gelince yukleme

6. Offline-First
- Lokal kuyruk (durum, rapor, malzeme, medya metadata)
- Cakisma cozum: son-yazan + yetki kurali + denetim kaydi

## Rol ve Yetki Sinirlari
- Teknisyen:
  - Is detayi gorur
  - Saha raporu/malzeme/fotograf girer
  - Durumu `DEVAM_EDIYOR` ve `RAPOR_BEKLIYOR` seviyesine kadar ilerletir

- Yetkili/Admin:
  - Rapor kalite kontrol
  - Puanlama ve rozet etkisi
  - Final `TAMAMLANDI` onayi
  - Cakisma ve geri dondurme yonetimi

## Teknik Mimari Onerisi
- Mobil: React Native (Expo)
- Auth: mevcut JWT/oturum mekanizmasi ile uyumlu API katmani
- Veri erisimi: `/api/operations/overview`, `/api/services`, servis guncelleme endpointleri
- Medya: presigned upload veya backend proxy upload (boyut/sure limiti ile)
- Offline store: SQLite/WatermelonDB veya MMKV + queue katmani
- Senkronizasyon:
  - Outbox pattern (islem bazli)
  - Retry/backoff
  - Idempotency key

## Uzun Vadeli Roadmap
### Dalga 1 - MVP (4-6 hafta)
- Is listesi, detay, durum guncelleme, rapor, malzeme, fotograf, offline queue
- Yetkili panelinde rapor onay akisi

### Dalga 2 - Operasyonel Sertlestirme (6-10 hafta)
- Gelismis conflict resolution
- Bildirimler (is atama/deadline)
- Form/sablon raporlama, imza, kalite checklist

### Dalga 3 - Optimizasyon ve Analitik (10+ hafta)
- Ekip performans benchmarki
- Lokasyon/rota optimizasyonu
- Tahmini sure/kapasite modelleme
- Mobilde rol bazli KPI dashboard

## Basari Metrikleri
- Zamaninda rapor kapanis orani
- Eksik rapor/fotograf oraninin dusmesi
- Geciken is oraninin dusmesi
- Teknisyen basina gunluk kapanan is sayisi
- Yetkili onay suresinin kisalmasi
