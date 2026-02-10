# Google Sheets Sync - Hızlı Başlangıç

## ⚡ İki Seçenek

### SEÇENEK 1: Manuel Sync (Şimdi Kullanmaya Başlayın) ✅

**Kurulum gerektirmez!** Hemen kullanmaya başlayabilirsiniz.

```bash
# 1. Sunucuyu başlatın
npm run dev

# 2. Manuel sync tetikleyin (yeni verileri çekmek için)
curl -X POST http://localhost:3000/api/servis/import

# 3. Sonuçları görün
curl http://localhost:3000/api/servis/import
```

**Kullanım Durumları:**
- ✅ Yeni servis eklediğinizde
- ✅ Google Sheets'te değişiklik yaptığınızda
- ✅ Veritabanını güncellemek istediğinizde

---

### SEÇENEK 2: Otomatik Sync (Google Cloud ile)

Her 5 dakikada bir otomatik senkronizasyon için.

#### Adım 1: Google Cloud Console'a Gidin

👉 https://console.cloud.google.com/

#### Adım 2: Yeni Proje Oluşturun (3 dakika)

1. Proje seçiciye tıklayın → "Yeni Proje"
2. İsim: `ServicePro-Sync`
3. "Oluştur"a tıklayın

#### Adım 3: Google Sheets API'yi Etkinleştirin (1 dakika)

1. Sol menü: **APIs & Services** → **Library**
2. Arama: "Google Sheets API"
3. "Enable" butonuna tıklayın

#### Adım 4: Service Account Oluşturun (2 dakika)

1. **APIs & Services** → **Credentials**
2. "Create Credentials" → **Service Account**
3. Formu doldurun:
   - Service account name: `servicepro-sync`
   - Description: `ServicePro ERP Sync`
4. "Create and Continue" → "Done"

#### Adım 5: Key Oluşturun (1 dakika)

1. Oluşturduğunuz service account'a tıklayın
2. **Keys** sekmesine gidin
3. **Add Key** → **Create new key**
4. ✅ **JSON** seçin (önemli!)
5. **Create** butonuna tıklayın
6. 💾 JSON dosyası indirilecek - **GÜVENLİ SAKLAYIN**

#### Adım 6: Google Sheets'e Erişim Verin (1 dakika)

1. İndirdiğiniz JSON dosyasını açın
2. `client_email` kopyalayın (örn: `servicepro-sync@project-id.iam.gserviceaccount.com`)
3. Google Sheets'i açın:
   ```
   https://docs.google.com/spreadsheets/d/1IGa23ZXugvCGblp4GtE2Tl06Z2mnZ2VxIM_F6vyolVs/edit
   ```
4. **Share** butonuna tıklayın
5. Email adresini yapıştırın
6. ✅ **Editor** olarak verin
7. "Send"e tıklayın

#### Adım 7: .env Dosyasını Güncelleyin (2 dakika)

`.env` dosyasını açın ve JSON dosyasındaki bilgileri ekleyin:

```env
# JSON dosyasından kopyalayın:
GOOGLE_SERVICE_ACCOUNT_EMAIL="servicepro-sync@your-project-id.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

**ÖNEMLİ:** Private key'teki `\n` karakterlerini koruyun!

#### Adım 8: Test Edin

```bash
# Sunucuyu yeniden başlatın
npm run dev

# Otomatik sync test edin
curl -X POST http://localhost:3000/api/servis/sync
```

---

## 🚀 Otomatik Sync Kurulumu

### Yerel Geliştirme (node-cron)

```bash
# node-cron kurun
npm install node-cron @types/node-cron

# Cron job script'i çalıştırın
node scripts/cron-sync.js
```

### Vercel Deployment

```bash
# vercel.json oluşturun
cat > vercel.json << EOF
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 * * * *"
    }
  ]
}
EOF

# Deploy edin
vercel
```

### Diğer Platformlar

- **Netlify**: Netlify Scheduled Functions
- **Railway**: Cron Jobs
- **Render**: Cron Jobs
- **AWS**: EventBridge + Lambda

---

## 📝 Hızlı Test Komutları

```bash
# 1. Mevcut durumu kontrol et
curl http://localhost:3000/api/servis/sync

# 2. Manuel sync tetikle
curl -X POST http://localhost:3000/api/servis/sync

# 3. Cron job test et (secret ile)
curl -H "Authorization: Bearer change-this-to-a-secure-random-string" \
  http://localhost:3000/api/cron/sync

# 4. Prisma Studio ile veritabanını görüntüle
npm run db:studio
```

---

## 🔧 Sorun Giderme

### "You do not have permission"
✅ **Çözüm:** Service account email'inin Google Sheets'te Editor olarak ayarlandığından emin olun.

### "Invalid_grant"
✅ **Çözüm:** Private key formatını kontrol edin. `\n` karakterleri korunmalı.

### "Token expired"
✅ **Çözüm:** Yeni key oluşturun (keys 10 yıl geçerlidir).

---

## ⏱️ Zaman Çizelgesi

- **Manuel Sync**: 5 dakika (kurulum gereksiz)
- **Otomatik Sync**: 10-15 dakika (ilk kurulum)

---

## 🎯 Tavsiye

Başlangıç için **Manuel Sync** kullanın. İhtiyacınız olduğunda sync endpoint'ini çağırın.

Daha sonra sistem büyüdükçe **Otomatik Sync** kurulumuna geçebilirsiniz.

---

## 📞 Yardım

Sorun yaşarsanız:
1. Detaylı rehber: `docs/GOOGLE_SHEETS_SETUP.md`
2. Kurulum raporu: `KURULUM_RAPORU.md`
3. Test script: `node scripts/test-sync.js`
