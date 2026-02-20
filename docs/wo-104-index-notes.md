# WO-104 - Index Notlari (Servis Listesi)

Bu not, `WO-104` kapsaminda servis listesi sorgulari icin mevcut ve onerilen indexleri ozetler.

## Mevcut Durum
- `Service` modelinde aktif kullanilan alanlar icin temel indexler mevcut:
  - `@@index([tarih])`
  - `@@index([durum])`
  - `@@index([durum, deletedAt])`
  - `@@index([deletedAt, tarih])`
  - `@@index([yer])`
- `ServicePersonel` modelinde atama filtreleri icin:
  - `@@index([servisId])`
  - `@@index([personelId])`

## WO-104 Sorgu Paterni
- Liste sorgusu:
  - `deletedAt IS NULL`
  - durum listesi (`IN`)
  - istege bagli metin arama (`tekneAdi`, `servisAciklamasi`, `adres`)
  - tarih araligi
  - personel adi/atama baglantisi
  - `ORDER BY createdAt DESC, tarih DESC`
  - sayfalama (`skip/take`)

## Onerilen Sonraki Iyilestirmeler
1. `Service` icin sira odakli index:
   - `@@index([deletedAt, createdAt, tarih])`
2. Metin arama agir senaryolari icin (PostgreSQL):
   - `tekne_adi`, `servis_aciklamasi`, `adres` alanlarinda trigram/GiN stratejisi
   - (Prisma disi migration SQL ile)
3. Personel ismi ile filtreleme yogunlasirsa:
   - `Personel(ad)` index gozden gecirilmeli (mevcut collation/ILIKE patternine gore)

## Not
- Yukaridaki gelistirmeler, migration etkisi ve production veri hacmine gore asamali uygulanmalidir.
- Bu sprintte kod tarafinda server-side pagination + debounce tamamlanmis, index genisletmesi bir sonraki DBA penceresine birakilmistir.
