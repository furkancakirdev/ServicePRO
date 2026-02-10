# ServicePro - Proje Durumu

**Son Güncelleme:** 2026-02-09  
**Durum:** Aktif geliştirme  
**Sürüm:** 1.0.0

---

## Genel Özet

Bu güncelleme ile proje, **Sheet -> App tek yön veri akışı** prensibine daha yakın bir yapıya getirildi.  
Servis kapanış/puanlama akışı tek modal sözleşmesine taşındı, servis listesi ve planlama tarafındaki veri uyumsuzlukları giderildi, Türkçe karakter bozulmalarının önemli bir kısmı temizlendi.

---

## Tamamlanan Ana İşler

### 1) Sync ve Veri Akışı

- [x] Senkronizasyon kanonik yolu `lib/sync/*` + `/api/sync` hattına toplandı.
- [x] Header bazlı kolon eşleme ve fail-fast kontrolleri güçlendirildi.
- [x] `TAMAMLANDI` ve `KESIF_KONTROL` kayıtlarını import dışı bırakma kuralı uygulandı.
- [x] Full reset sync akışı çalışır durumda (idempotent davranış hedefiyle).
- [x] `/api/sync/status` genişletildi:
  - `latestSuccess`
  - `cronHealth`
  - son koşu özeti (`summary`)
- [x] `/api/sync/validate` doğrulama çıktısı Ayarlar ekranında detay paneliyle görünür hale getirildi
  - özet metrikler (eksik/fazla/mismatch)
  - örnek satır farkları
  - kolon kayması raporu
- [x] Canlı doğrulama için kritik alan analizi eklendi (tarih/adres/yer/durum mismatch sayımı)
  - Ayarlar ekranında `Tam doğrulama` (geniş örnek) seçeneği
- [x] CLI tam doğrulama komutu eklendi
  - `npm run sync:validate`
  - `npm run sync:validate:strict`

### 2) Servisler / Planlama / Kapanış Akışı

- [x] Servis tablosu alan eşleşmeleri düzeltildi (tarih, tekne, adres/lokasyon, açıklama, durum).
- [x] Tarih filtreleme, durum çoklu filtreleme ve adres grup filtreleme (YATMARİN/NETSEL/DIŞ SERVİS) aktif.
- [x] Planlama sayfasında eski kapanış sidebar kaldırıldı.
- [x] Planlama sayfası yeni `ServisKapanisModal` sözleşmesine bağlandı.
- [x] Düzenle ekranında `TAMAMLANDI` seçimi sonrası kalite kontrol akışına yönlendirme korunarak UX notu eklendi.

### 3) Puanlama Modülü

- [x] Yetkili değerlendirme API’si, kayıtlı cevapları (sadece toplam değil) dönecek şekilde genişletildi.
- [x] Yetkili ekranı mevcut cevapları prefill edecek şekilde güncellendi.
- [x] Yetkili ekranına `Kaydet ve Sonraki` akışı eklendi.
- [x] İsmail ekranına `Tümünü Kaydet` toplu kayıt akışı eklendi.
- [x] Puanlama görünümünde katsayı metinleri sadeleştirildi; sütun davranışı netleştirildi.

### 4) Dashboard / Takvim / UI

- [x] Dashboard metrikleri (özellikle bekleyen servis sayısı) enum bazlı doğru hesaplamaya çekildi.
- [x] Dashboard kart -> filtreli liste -> tekne/servis geçişi (drill-down) akışı iyileştirildi.
- [x] Takvim sayfası görsel ve kullanılabilirlik açısından modernize edildi.
- [x] Global tema çekirdeği yenilendi (tipografi + arka plan atmosferi + kart/buton görsel dili)
  - `Manrope` + `Space Grotesk` font çifti
  - daha tutarlı yüzey/kontrast tokenları
  - tüm sayfalara yansıyan kart ve buton modernizasyonu
  - `Slate + Cyan Ops Dark` stili globalize edildi (header/kart/tablo/form katmanları)
- [x] Sayfa bazlı tema uyumu güçlendirildi
  - `Servisler` ekranı: hero başlık, özet chip'ler, tablo yüzey modernizasyonu
  - `Takvim` ekranı: global tema ile uyumlu panel/legend ve FullCalendar renk/toolbar düzeni
  - `Dashboard` ekranı: hero panel + metrik chip'leri ve panel yüzey standardizasyonu
  - `Dashboard` ekranı (detay turu): aktivite/trend ikon renklerinin tema token uyumu
  - `Personel` ekranı: hero panel, kart/panel katman uyumu
  - `Puanlama` ekranı: hero panel + özet kartlar + tablo yüzeyi uyumu
  - `Puanlama/Geçmiş` ekranı: bozuk Türkçe metinlerin temizlenmesi + hero/panel uyumu
  - `Puanlama/Rapor` ekranı: hero panel + form/hesap kartları yüzey uyumu
  - `Planlama` ekranı: hero panel + filtre/tablo yüzey uyumu
  - `Planlama/Yeni` ve `Planlama/Düzenle` ekranları: hero panel + form yüzeyi uyumu
  - `Planlama/Detay` ekranı: bozuk metin temizliği + hero/panel uyumu
  - `Yetkili` ve `İsmail` değerlendirme ekranları: hero panel + kart/tablo yüzey uyumu
  - `Ayarlar` ekranı: hero panel + ayar kartları ve sync panel yüzey uyumu
  - `Ayarlar/Tema` ekranı: hero panel + tema kartlarının modern yüzey uyumu, Türkçe metin temizliği
  - `Ayarlar/Kullanıcılar` ekranı: hero panel + form/tablo panel uyumu, Türkçe metin temizliği
  - `Raporlar/Performans` ekranı: hero panel + filtre/tablo yüzey uyumu
  - `Raporlar/WhatsApp` ekranı: hero panel + çıktı/özet/kullanım kartlarının yüzey uyumu
  - `Raporlar/Rozetler` ekranı: hero panel + aylık/yıllık kartların yüzey uyumu
  - `Marlin Yıldızı` ekranı: hero panel + soru kartları + puan özeti tema token uyumu
  - `Ayarlar/Puanlama` ekranı: yönetim kartları + rozet/katsayı/soru panelleri token uyumu
  - `Takvim` ekranı (detay turu): popup/dialog/filtre metin ve yüzeylerinin tema token uyumu
  - `Servis Detay` ekranı: hero panel + durum/özet kartları yüzey uyumu
  - `Servis Detay` ekranı (detay turu): durum aksiyonları, personel avatar/bonus, taşeron-parça kartlarında token tabanlı renk uyumu
  - `Personel/Detay` ekranı: bozuk metin temizliği + hero/panel uyumu
  - `PageLayout` üzerinden gelen ekranlarda da global başlık paneli aynı stile çekildi (`page-header` güncellendi)

### 5) Türkçe Karakter ve Metin Kalitesi

- [x] Merkezi tip/label dosyalarında çok sayıda mojibake temizlendi (`types/index.ts`).
- [x] Durum, lokasyon, soru metinleri ve personel adlarındaki bozuklukların önemli kısmı düzeltildi.
- [x] Global `Header` bileşenindeki bozuk Türkçe metinler temizlendi (bildirim, sayfa başlıkları, kullanıcı menüsü).

---

## Teknik Doğrulama Sonuçları

Son tur değişiklikleri sonrası:

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test -- --runInBand`
- [x] `npm run test:regression` (önceki turda çalıştırıldı)
- [x] `npm run build:strict` (2026-02-09)

---

## Bilinen Açık Kalemler

### Yüksek Öncelik

- [x] Google Sheet canlı verisi ile satır-satır son doğrulama (özellikle lokasyon/tarih/durum kombinasyonları).
  - 2026-02-09 canlı sonuç: `Eksik=0`, `Fazla=0`, `Mismatch=0`, `KritikMismatch=0`
  - Snapshot: `Sheet=2784`, `Etkili=62`, `Durum dışı=2720`, `Geçersiz=2`
- [x] Dashboard için ek operasyonel istatistik kartlarının tamamlanması.
- [ ] Figma temelli uçtan uca yeni tema uygulaması (tüm ekranlarda tutarlı tasarım dili).
  - global tema altyapısı ve temel sayfa uyumu tamamlandı; Dashboard/Servisler/Takvim/Personel/Puanlama/Planlama/Yetkili/İsmail/Ayarlar/Raporlar/ServisDetay hizalandı, Figma birebir artboard uygulaması açık.

### Orta Öncelik

- [x] Uygulama genelinde kalan Türkçe bozuk metinlerin ikinci tarama turu.
- [x] Yetkili / İsmail puan ekranlarında aylık kilitleme ve overwrite kurallarının son UX cilası.
- [x] Admin-only katsayı ayar ekranının son yetki/UX kontrolü.

### Düşük Öncelik

- [x] Dokümantasyon (README/ARCHITECTURE/FEATURES) metinlerinin güncel akışlarla hizalanması.

---

## Kritik Notlar

- Üretimde veri yazan senkronizasyon yolları tek hatta indirgenmiştir; legacy akışların veri yazmaması esastır.
- Planlama ekranında artık eski kapanış bileşeni kullanılmaz.
- Servis kapanışı için referans akış: `ServisKapanisModal` + `/api/services/[id]/complete`.
- Canlı Sheet-DB satır doğrulaması için `GET /api/sync/validate` endpoint'i ve Ayarlar ekranında `Sheet-DB Doğrula` butonu eklendi.
- Build engelleri giderildi:
  - `/servisler` için `useSearchParams` kullanımı `Suspense` boundary ile sarıldı
  - `/api/puanlama/aylik` route dinamik olarak işaretlendi (`force-dynamic`)

---

## Ortam

```txt
Node.js: 18+
Next.js: 14.x
TypeScript: 5.x
Prisma: 5.x
React: 18.x
```
