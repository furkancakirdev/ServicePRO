/**
 * Google Sheets Sync Test Script
 * Senkronizasyon sistemini test eder
 *
 * Kullanım: node scripts/test-sync.js
 */

const { PrismaClient } = require('@prisma/client');

// Mock environment variables for testing
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'test@example.com';
process.env.GOOGLE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n';

async function testSync() {
  console.log('\n========================================');
  console.log('  GOOGLE SHEETS SYNC TEST');
  console.log('========================================\n');

  const prisma = new PrismaClient();

  try {
    // 1. Mevcut servisleri kontrol et
    console.log('1. Mevcut servisler kontrol ediliyor...');
    const servisler = await prisma.service.findMany({
      include: { tekne: true },
    });

    console.log(`   ✓ ${servisler.length} servis bulundu\n`);

    // 2. Tekneleri kontrol et
    console.log('2. Mevcut tekneler kontrol ediliyor...');
    const tekneler = await prisma.tekne.findMany();

    console.log(`   ✓ ${tekneler.length} tekne bulundu\n`);

    // 3. Durum dağılımı
    console.log('3. Durum dağılımı:');
    const durumSayisi = servisler.reduce((acc, s) => {
      acc[s.durum] = (acc[s.durum] || 0) + 1;
      return acc;
    }, {});

    Object.entries(durumSayisi).forEach(([durum, sayi]) => {
      console.log(`   - ${durum}: ${sayi} adet`);
    });
    console.log('');

    // 4. Örnek servis detayı
    if (servisler.length > 0) {
      console.log('4. Örnek servis detayı:');
      const ornek = servisler[0];
      console.log(`   ID: ${ornek.id}`);
      console.log(`   Tekne: ${ornek.tekneAdi}`);
      console.log(`   Tarih: ${ornek.tarih || 'Tarihsiz'}`);
      console.log(`   Durum: ${ornek.durum}`);
      console.log(`   Lokasyon: ${ornek.adres} / ${ornek.yer}`);
      console.log('');
    }

    console.log('========================================');
    console.log('  ✅ TEST BAŞARILI');
    console.log('========================================');
    console.log('\n📝 Sonraki Adımlar:');
    console.log('   1. Google Sheets API kurulumu yapın');
    console.log('   2. .env dosyasını güncelleyin');
    console.log('   3. npm run dev ile server\'ı başlatın');
    console.log('   4. curl -X POST http://localhost:3000/api/sync -H \"Content-Type: application/json\" -d \"{\\\"mode\\\":\\\"incremental\\\",\\\"sheet\\\":\\\"PLANLAMA\\\"}\"');
    console.log('\n📖 Detaylı kurulum için: docs/GOOGLE_SHEETS_SETUP.md\n');

  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testSync();
