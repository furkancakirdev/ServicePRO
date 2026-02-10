# Manuel Sync - Kullanım Rehberi

## 📊 Mevcut Durum

✅ **12 Tekne** ve **12 Servis** veritabanında kayıtlı!

## 🎯 Pratik Kullanım

### 1. Yeni Veri Çekme (Google Sheets'ten)

```bash
curl -X POST http://localhost:3006/api/servis/import
```

**Kullanım Durumları:**
- ✅ Google Sheets'e yeni servis eklediğinizde
- ✅ Mevcut servislerde değişiklik yaptığınızda
- ✅ Veritabanını güncellemek istediğinizde

**Örnek Çıktı:**
```json
{
  "success": true,
  "data": {
    "tekneler": 0,
    "yeniServis": 2,
    "guncellenenServis": 10,
    "skipped": 0,
    "hatalar": 0,
    "hataDetaylari": []
  },
  "message": "12 servis başarıyla içe aktarıldı"
}
```

### 2. Mevcut Durumu Kontrol Etme

```bash
curl http://localhost:3006/api/servis/import
```

**Çıktı:**
```json
{
  "success": true,
  "data": {
    "mevcutServis": 12,
    "mevcutTekne": 12,
    "bekleyenImport": 12
  }
}
```

### 3. Veritabanını Görüntüleme

```bash
npm run db:studio
```

Tarayıcınızda açın: **http://localhost:5555**

## 🔧 Günlük Akış

### Sabah Başlangıcı

```bash
# 1. Sunucuyu başlat
npm run dev

# 2. Google Sheets'teki yeni verileri çek
curl -X POST http://localhost:3006/api/servis/import

# 3. Sonuçları kontrol et
curl http://localhost:3006/api/servis/import

# 4. Veritabanını görüntüle
npm run db:studio
```

### Yeni Servis Ekleme

**Adımlar:**
1. Google Sheets'e yeni servis ekleyin
2. Import command'ını çalıştırın:
   ```bash
   curl -X POST http://localhost:3006/api/servis/import
   ```
3. Prisma Studio'da doğrulayın

### Servis Güncelleme

**Adımlar:**
1. Google Sheets'te servis bilgilerini güncelleyin
2. Import command'ını çalıştırın
3. Veriler otomatik güncellenecek

## 📋 Batch Script'ler

### Windows (PowerShell)

```powershell
# sync.ps1
$response = Invoke-RestMethod -Uri "http://localhost:3006/api/servis/import" -Method Post
Write-Host "✅ Sync tamamlandı!" -ForegroundColor Green
Write-Host "Yeni: $($response.data.yeniServis)"
Write-Host "Güncellenen: $($response.data.guncellenenServis)"
```

**Kullanım:**
```powershell
.\sync.ps1
```

### Linux/Mac (Bash)

```bash
#!/bin/bash
# sync.sh

echo "🔄 Sync başlatılıyor..."
response=$(curl -s -X POST http://localhost:3006/api/servis/import)

echo "✅ Sync tamamlandı!"
echo "$response" | python -m json.tool
```

**Kullanım:**
```bash
chmod +x sync.sh
./sync.sh
```

## 🚀 NPM Script'leri

`package.json`'da zaten tanımlı:

```bash
# Mevcut servisleri kontrol et
npm run sync:check

# Manuel sync tetikle
curl -X POST http://localhost:3006/api/servis/import
```

## 📱 Pratik Komutlar

### Tüm Servisleri Listele

```bash
npm run db:studio
# Sonra tarayıcıda Service tablosuna tıklayın
```

### Belirli Bir Teknenin Servislerini Bul

```bash
# Prisma Studio'da filtreleme kullanın
# veya script kullanın:
node scripts/check-import.js
```

### Durum Dağılımı

```bash
node scripts/check-import.js
```

**Çıktı:**
```
🛥️  Toplam Tekne: 12
📋 Toplam Servis: 12

Durum Dağılımı:
   RANDEVU_VERILDI: 6 adet
   DEVAM_EDİYOR: 6 adet
```

## 🔄 Manuel Sync vs Otomatik Sync

### Manuel Sync (Şu an kullandığımız)

✅ **Avantajları:**
- Kontrol sizde - istediğiniz zaman sync edersiniz
- API quota tüketmez
- Basit ve güvenilir
- Kurulum gerektirmez

⚠️ **Dezavantajları:**
- Her seferinde manuel komut çalıştırmak gerekir
- Unutursanız veriler güncel kalmayabilir

### Otomatik Sync (İsteğe bağlı)

✅ **Avantajları:**
- Arka planda otomatik çalışır
- Her zaman güncel veriler
- Cron job ile zamanlayabilirsiniz

⚠️ **Dezavantajları:**
- Google Cloud kurulumu gerektirir
- API quota kullanır
- Daha karmaşık setup

## 📊 Veri Akışı Diyagramı

```
Google Sheets (Edit)
        ↓
curl POST /api/servis/import
        ↓
API Endpoint (route.ts)
        ↓
Prisma (PostgreSQL)
        ↓
Veritabanı Güncel ✅
```

## 🎯 En İyi Pratikler

### 1. Düzenli Sync

Her gün sabah veya yeni servis eklediğinizde sync yapın:

```bash
# Her gün sabah
curl -X POST http://localhost:3006/api/servis/import
```

### 2. Sync Öncesi Kontrol

Önce mevcut durumu kontrol edin:

```bash
curl http://localhost:3006/api/servis/import
```

### 3. Hata Kontrolü

Sync sonrası hataları kontrol edin:

```bash
curl -s -X POST http://localhost:3006/api/servis/import | grep -o '"hatalar":[0-9]*'
```

### 4. Backup Öncesi

Önemli değişiklikler öncesi sync yapın:

```bash
# Değişiklik öncesi
curl -X POST http://localhost:3006/api/servis/import

# Değişiklikleri yapın

# Değişiklik sonrası
curl -X POST http://localhost:3006/api/servis/import
```

## 🔍 Sorun Giderme

### "Servis güncellenmedi"

**Çözüm:**
1. Google Sheets'te ID'nin doğru olduğunu kontrol edin
2. Import sonrası response'u inceleyin
3. Prisma Studio'da manuel kontrol edin

### "Yeni servis eklenmedi"

**Çözüm:**
1. Google Sheets'te verinin dolu olduğunu kontrol edin
2. ID alanının benzersiz olduğundan emin olun
3. Tarih formatının DD.MM.YYYY olduğunu doğrulayın

### "API erişilemiyor"

**Çözüm:**
```bash
# Sunucunun çalıştığından emin olun
npm run dev

# Başka bir port deneyin
curl http://localhost:3000/api/servis/import
curl http://localhost:3001/api/servis/import
# ... vb.
```

## 📝 Özet

**Manuel Sync** şu an için en pratik çözüm:

1. ✅ Kurulum gerektirmez
2. ✅ Hemen kullanılabilir
3. ✅ Kontrol sizde
4. ✅ Basit ve güvenilir

**Temel Komutlar:**
```bash
# Sync yap
curl -X POST http://localhost:3006/api/servis/import

# Durumu kontrol et
curl http://localhost:3006/api/servis/import

# Veritabanını görüntüle
npm run db:studio
```

**İleri aşamada:** Otomatik sync kurulumu için `QUICK_SETUP.md` rehberini kullanabilirsiniz.
