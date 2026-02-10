# Google Sheets Senkronizasyon Kurulumu

Bu rehber, ServicePro ERP ile Google Sheets arasında senkronizasyon kurmak için adım adım talimatlar içerir.

## 📋 Ön Koşullar

- Google Cloud projesi
- Google Sheets erişimi
- ServicePro ERP kurulumu tamamlanmış olmalı

## 🔧 Google Service Account Oluşturma

### 1. Google Cloud Console'a Gidin

```
https://console.cloud.google.com/
```

### 2. Yeni Proje Oluşturun

1. Sol üstteki proje seçiciye tıklayın
2. "Yeni Proje"ye tıklayın
3. Proje adı girin (örn: "ServicePro-Sync")
4. "Oluştur"a tıklayın

### 3. Google Sheets API'yi Etkinleştirin

1. "APIs & Services" > "Library"e gidin
2. "Google Sheets API" arayın
3. "Enable"e tıklayın

### 4. Service Account Oluşturun

1. "APIs & Services" > "Credentials"e gidin
2. "Create Credentials" > "Service Account"u seçin
3. Service account details:
   - Name: `servicepro-sync`
   - Service account ID: `servicepro-sync`
   - Description: `ServicePro ERP Google Sheets Senkronizasyon`
4. "Create and Continue"e tıklayın
5. Role kısmını atlayın (Skip)
6. "Done"e tıklayın

### 5. Service Account Key Oluşturun

1. Oluşturduğunuz service account'a tıklayın
2. "Keys" sekmesine gidin
3. "Add Key" > "Create new key"
4. Key type: **JSON** seçin (önemli!)
5. "Create"e tıklayın
6. JSON dosyası otomatik indirilecek - **BU DOSYAYI GÜVENLİ SAKLAYIN**

### 6. Google Sheets'e Erişim Verin

1. JSON dosyasını açın ve `client_email` adresini kopyalayın
2. Google Sheets dokümanını açın:
   ```
   https://docs.google.com/spreadsheets/d/1IGa23ZXugvCGblp4GtE2Tl06Z2mnZ2VxIM_F6vyolVs/edit
   ```
3. "Share" butonuna tıklayın
4. `client_email` adresini yapıştırın (örn: `servicepro-sync@project-id.iam.gserviceaccount.com`)
5. Editor olarak verin
6. "Send"e tıklayın

## 🗝️ Environment Variables Yapılandırması

`.env` dosyanızı aşağıdaki şekilde güncelleyin:

```env
# Google Sheets Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL="servicepro-sync@your-project-id.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Cron Job Secret (opsiyonel ama önerilir)
CRON_SECRET="random-long-secret-string-here"
```

### Private Key Formatı

İndirdiğiniz JSON dosyasından `private_key` alanını kopyalayın. Key'i doğru formatta kopyalamak önemlidir:

```bash
# JSON dosyasından
{
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
}

# .env dosyasına
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

**Önemli:** `\n` karakterleri korunmalıdır!

## 🚀 Senkronizasyon Kullanımı

### Manuel Senkronizasyon

```bash
curl -X POST http://localhost:3000/api/servis/sync
```

### Senkronizasyon Durumu Kontrolü

```bash
curl http://localhost:3000/api/servis/sync
```

### Otomatik Senkronizasyon (Cron Job)

#### Yerel Geliştirme (node-cron)

```typescript
// app/api/cron/sync/route.ts zaten hazır
// Her saat başı çalışması için package.json'a ekleyin
```

#### Vercel部署 (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 * * * *"
    }
  ]
}
```

#### Diğer Platformlar

- **Netlify**: Netlify Scheduled Functions
- **AWS Lambda**: EventBridge Scheduler
- **GitHub Actions**: Workflow schedule

## 📊 Senkronizasyon Mantığı

### Akış

```
Google Sheets → fetchServicesFromSheets()
              ↓
         extractUniqueTekneler()
              ↓
         Tekneleri kaydet/upsert
              ↓
         Servisleri kaydet/upsert
              ↓
         PostgreSQL güncel
```

### Veri Mapping

| Google Sheets | PostgreSQL |
|--------------|------------|
| PLANLANDI-RANDEVU | RANDEVU_VERILDI |
| DEVAM EDİYOR | DEVAM_EDİYOR |
| TAMAMLANDI | TAMAMLANDI |
| PARCA BEKLIYOR | PARCA_BEKLIYOR |
| MÜŞTERİ ONAY BEKLIYOR | MUSTERI_ONAY_BEKLIYOR |

### Tarih Formatı

- Google Sheets: `DD.MM.YYYY` (örn: `03.02.2026`)
- PostgreSQL: `DateTime` (ISO 8601)

## 🔍 Sorun Giderme

### Hata: "Error: Token has been expired"

**Çözüm:** Service account key'inin süresi dolmamıştır. Yeni key oluşturun.

### Hata: "You do not have permission"

**Çözüm:**
1. Service account email'inin Sheets'te paylaşıldığından emin olun
2. Email'i Editor olarak ayarladığınızı kontrol edin
3. 5-10 dakika bekleyin (izinlerin aktif olması için)

### Hata: "Invalid_grant"

**Çözüm:** Private key formatını kontrol edin. `\n` karakterleri korunmalıdır.

### Hata: "Connection refused"

**Çözüm:** Internet bağlantınızı ve firewall ayarlarınızı kontrol edin.

## 🧪 Test

```bash
# 1. Environment variables yüklü mü kontrol edin
npm run dev

# 2. Manuel sync deneyin
curl -X POST http://localhost:3000/api/servis/sync

# 3. Sonucu kontrol edin
curl http://localhost:3000/api/servis/sync

# 4. Prisma Studio ile veritabanını kontrol edin
npm run db:studio
```

## 📝 Best Practices

1. **Güvenlik:**
   - `.env` dosyasını asla GitHub'a commitlemeyin
   - `.gitignore` dosyasında olduğundan emin olun
   - Production'da güçlü CRON_SECRET kullanın

2. **Performans:**
   - Çok büyük dataset'lerde sayfalama (pagination) kullanın
   - Cache mekanizması implemente edin

3. **Hata Yönetimi:**
   - Retry logic ekleyin
   - Error logging (Sentry, LogRocket vs.) kullanın
   - Monitoring/alerting kurun

4. **Backup:**
   - Google Sheets verilerini düzenli backup'layın
   - PostgreSQL backup'larını alın

## 🔄 İleri Seviye Konfigürasyon

### Bidirectional Sync (Çift Yönlü)

PostgreSQL değişikliklerini Google Sheets'e geri yazmak için:

```typescript
// lib/google-sheets-sync.ts
export async function bidirectionalSync() {
  // 1. Sheets → PostgreSQL
  await importServicesToDatabase();

  // 2. PostgreSQL → Sheets
  await exportToSheets();
}
```

### Incremental Sync (Sadece Değişiklikler)

```typescript
// Son sync zamanını takip edin
const lastSync = await getLastSyncTime();
const changes = await getChangesSince(lastSync);
```

## 📞 Destek

Sorun yaşarsanız:
1. Bu dokümanı tekrar okuyun
2. Google Cloud Console'da hata loglarını kontrol edin
3. API response'larını inceleyin
4. Prisma Studio ile veritabanını kontrol edin

## ✅ Kurulum Kontrol Listesi

- [ ] Google Cloud projesi oluşturuldu
- [ ] Google Sheets API etkinleştirildi
- [ ] Service account oluşturuldu
- [ ] Service account key indirildi (JSON)
- [ ] Service account Sheets'e erişim eklendi (Editor)
- [ ] `.env` dosyası güncellendi
- [ ] `GOOGLE_SERVICE_ACCOUNT_EMAIL` eklendi
- [ ] `GOOGLE_PRIVATE_KEY` eklendi (doğru format)
- [ ] `CRON_SECRET` oluşturuldu (opsiyonel)
- [ ] Manuel sync test edildi
- [ ] Otomatik cron job kurulumu yapıldı

Tüm adımlar tamamlandığında senkronizasyon sistem hazır! 🎉
