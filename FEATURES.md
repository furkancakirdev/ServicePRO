# ServicePro Ozellik Seti

Bu dosya aktif ozelliklerin guncel durumunu ozetler.

## 1) Senkronizasyon ve Veri Dogrulama

- Kanonik sync katmani: `lib/sync/*`
- Manuel sync: `POST /api/sync`
- Otomatik sync: `GET /api/cron/sync`
- Son durum ozeti: `GET /api/sync/status`
- Sheet-DB dogrulama: `GET /api/sync/validate`
- PLANLAMA importinda `TAMAMLANDI` ve `KESIF_KONTROL` satirlari dislanir
- Header drift tespiti ve fail-fast hata raporu desteklenir

## 2) Servisler Sayfasi

Servis tablosu kolonlari:

- `Tarih Saat`
- `Tekne Adi`
- `Adres`
- `Servis Aciklamasi`
- `Durum`

Desteklenen filtre/siralama:

- Tarih bazli filtre (`date`, `dateFrom`, `dateTo`)
- Tarih varsayilan siralama (`desc`)
- Adres grubu filtreleri: `YATMARIN`, `NETSEL`, `DIS_SERVIS`
- Durum coklu secim filtresi

## 3) Servis Detay ve Kapanis Akisi

- Servis detay sayfasinda duzenleme ve durum degistirme
- `TAMAMLANDI` seciminde kapanis akisi
- `POST /api/services/[id]/complete` ile:
  - personel atama
  - kalite kontrol cevaplari
  - bonus personel secimi
  - puan hesaplama

## 4) Puanlama Modulu

- Aylik puanlama tablosu
- Yetkili degerlendirme sayfasi (`/deger`)
- Ismail degerlendirme sayfasi (`/ismail`)
- Puanlama API'leri:
  - `GET /api/puanlama/aylik`
  - `POST /api/puanlama/kaydet`
  - `POST /api/puanlama/yetkili`
  - `POST /api/puanlama/ismail`

## 5) Dashboard

- `GET /api/stats` ile operasyon metrikleri
- `GET /api/weather` ile lokasyon bazli hava durumu
- Kartlardan filtreli liste akisina gecis

## 6) Takvim

- FullCalendar tabanli gorunum
- Tema ile uyumlu modern panel/toolbar stilleri
- Lokasyon ve tarih odakli operasyon izleme

## 7) Personel Yonetimi

- Personel listeleme/ekleme/guncelleme
- `personel` ve `personnel` rota uyumlulugu
- Unvan ve aktiflik yonetimi

## 8) Rol ve Yetki Modeli

- `ADMIN`: tam yetki
- `YETKILI`: operasyon + degerlendirme
- `TEKNISYEN`: kisitli yetki

## 9) Bilinen Sinirlar

- Figma birebir artboard seviyesinde tum ekran modernizasyonu acik kalemdir.
- Dokumantasyon surekli kod degisiklikleri ile birlikte guncellenmelidir.
