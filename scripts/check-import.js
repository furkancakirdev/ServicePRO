/**
 * Import Verification Script
 * Shows imported services from database
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkImport() {
  console.log('\n========================================');
  console.log('  ICE AKTARILAN SERVISLER RAPORU');
  console.log('========================================\n');

  // Tekneler
  const tekneler = await prisma.tekne.findMany({
    orderBy: { ad: 'asc' }
  });
  console.log(`🛥️  Toplam Tekne: ${tekneler.length}`);
  tekneler.forEach(t => console.log(`   - ${t.ad} (${t.adres})`));
  console.log('');

  // Servisler
  const servisler = await prisma.service.findMany({
    include: { tekne: true },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`📋 Toplam Servis: ${servisler.length}\n`);

  servisler.forEach((s, i) => {
    const tarih = s.tarih ? s.tarih.toISOString().split('T')[0] : 'Tarihsiz';
    const saat = s.saat || '--:--';

    console.log(`${i + 1}. [${s.id}] ${s.tekneAdi}`);
    console.log(`   Tarih: ${tarih} ${saat}`);
    console.log(`   Durum: ${s.durum}`);
    console.log(`   Lokasyon: ${s.adres} / ${s.yer}`);
    console.log(`   Is: ${s.servisAciklamasi.substring(0, 70)}...`);
    if (s.irtibatKisi) {
      console.log(`   Irtibat: ${s.irtibatKisi} - ${s.telefon || 'N/A'}`);
    }
    console.log('');
  });

  // Durum ozeti
  const durumSayisi = servisler.reduce((acc, s) => {
    acc[s.durum] = (acc[s.durum] || 0) + 1;
    return acc;
  }, {});

  console.log('========================================');
  console.log('  DURUM DAGILIMI');
  console.log('========================================');
  Object.entries(durumSayisi).forEach(([durum, sayi]) => {
    console.log(`   ${durum}: ${sayi} adet`);
  });
  console.log('========================================\n');

  await prisma.$disconnect();
}

checkImport().catch(error => {
  console.error('Hata:', error);
  process.exit(1);
});
