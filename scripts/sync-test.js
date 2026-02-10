/**
 * Google Sheets Sync Test Script
 *
 * Bu script, Google Sheets senkronizasyonunu test eder
 *
 * Kullanım:
 *   node scripts/sync-test.js           - Manuel sync test
 *   node scripts/sync-test.js --auto    - Otomatik sync test
 */

const http = require('http');

const API_URL = 'http://localhost:3000';
const SYNC_ENDPOINT = '/api/sync';
const CRON_ENDPOINT = '/api/cron/sync';

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data && process.env.CRON_SECRET) {
      options.headers['Authorization'] = `Bearer ${process.env.CRON_SECRET}`;
    }

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testManualSync() {
  console.log('\n========================================');
  console.log('  MANUEL SYNC TEST');
  console.log('========================================\n');

  try {
    // 1. Durum kontrolü
    console.log('1. Senkronizasyon durumu kontrol ediliyor...');
    const status = await makeRequest('GET', SYNC_ENDPOINT);

    if (status.status === 200) {
      console.log('   ✅ Sync servisi hazır');
      console.log('   ✅ Sync endpoint erişilebilir');
      console.log(`   🕒 Timestamp: ${new Date().toISOString()}\n`);
    } else {
      console.log('   ❌ Sync servisi hazır değil');
      console.log(`   Status: ${status.status}\n`);
      return;
    }

    // 2. Manuel sync tetikleme
    console.log('2. Manuel senkronizasyon tetikleniyor...');
    console.log('   ⏳ Lütfen bekleyin...\n');

    const syncResult = await makeRequest('POST', SYNC_ENDPOINT, { mode: 'incremental', sheet: 'PLANLAMA' });

    if (syncResult.status === 200 && syncResult.data.success) {
      const { totals } = syncResult.data;
      console.log('   ✅ Senkronizasyon başarılı!\n');
      console.log('   📊 Sonuçlar:');
      console.log(`   - Created: ${totals?.created || 0}`);
      console.log(`   - Updated: ${totals?.updated || 0}`);
      console.log(`   - Deleted: ${totals?.deleted || 0}`);
      console.log(`   - Errors: ${totals?.errors || 0}\n`);
    } else if (syncResult.data.error) {
      console.log('   ⚠️ Senkronizasyon yapılamadı\n');
      console.log('   Hata:', syncResult.data.error.message);

      if (syncResult.data.error.message.includes('GOOGLE')) {
        console.log('\n   💡 Çözüm:');
        console.log('   Google Sheets API kurulumu gerekli.');
        console.log('   Detaylı bilgi için: QUICK_SETUP.md\n');
      }
    }

  } catch (error) {
    console.log('   ❌ Hata:', error.message);
    console.log('\n   💡 Çözüm:');
    console.log('   Sunucu çalışıyor mu? npm run dev\n');
  }

  console.log('========================================\n');
}

async function testCronSync() {
  console.log('\n========================================');
  console.log('  CRON SYNC TEST');
  console.log('========================================\n');

  try {
    console.log('1. Cron job tetikleniyor...');
    console.log('   ⏳ Lütfen bekleyin...\n');

    const cronResult = await makeRequest('GET', `${CRON_ENDPOINT}?mode=incremental`, true);

    if (cronResult.status === 200 && cronResult.data.success) {
      const { totals } = cronResult.data;
      console.log('   ✅ Cron job başarılı!\n');
      console.log('   📊 Sonuçlar:');
      console.log(`   - Created: ${totals?.created || 0}`);
      console.log(`   - Updated: ${totals?.updated || 0}`);
      console.log(`   - Deleted: ${totals?.deleted || 0}`);
      console.log(`   - Errors: ${totals?.errors || 0}`);
      console.log(`   - Timestamp: ${cronResult.data.timestamp}\n`);
    } else if (cronResult.status === 401) {
      console.log('   ❌ Yetkilendirme hatası\n');
      console.log('   💡 Çözüm:');
      console.log('   .env dosyasında CRON_SECRET tanımlı olmalı\n');
    } else if (cronResult.data.error) {
      console.log('   ⚠️ Cron job başarısız\n');
      console.log('   Hata:', cronResult.data.error.message);
    }

  } catch (error) {
    console.log('   ❌ Hata:', error.message);
  }

  console.log('========================================\n');
}

async function main() {
  const args = process.argv.slice(2);
  const isAuto = args.includes('--auto');

  console.log('\n⚡ ServicePro ERP - Sync Test\n');
  console.log('API URL:', API_URL);
  console.log('Server:', isAuto ? 'Otomatik Sync' : 'Manuel Sync');

  await testManualSync();

  if (isAuto) {
    await testCronSync();
  }

  console.log('📝 Sonraki Adımlar:');
  console.log('   - Google Sheets API kurulumu için: QUICK_SETUP.md');
  console.log('   - Veritabanını görüntülemek için: npm run db:studio');
  console.log('   - Sunucuyu başlatmak için: npm run dev\n');
}

main().catch(console.error);
