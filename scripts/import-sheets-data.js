/**
 * Google Sheets Veri Import Script - TÜM VERİLER
 * Mevcut servis verilerini PostgreSQL'e import eder
 *
 * Kullanım: node scripts/import-sheets-data.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Google Sheets'ten okunan TÜM veriler (aktif + boş)
const SHEETS_DATA = [
  {
    id: '2720',
    tarih: '03.02.2026',
    saat: '10:00',
    tekneAdi: 'SCREENEX',
    adres: 'YATMARIN',
    yer: 'TOPRAK SAHA ELEKTRİK DİREĞİ YANINDA',
    servisAciklamasi: 'SEAKEEPER 26 STABILIZER 2000 SAAT SERVİSLERİ SÖKÜM',
    irtibatKisi: 'OSMAN BEY',
    telefon: '90 537 206 70 57',
    durum: 'PLANLANDI-RANDEVU',
  },
  {
    id: '2721',
    tarih: '03.02.2026',
    saat: '09:30',
    tekneAdi: 'TERRA',
    adres: 'YATMARIN',
    yer: 'ALFA - DIŞ',
    servisAciklamasi: 'MOTOR MARŞ DİNAMO ARIZASI + BAZEN VİTESE GEÇMİYOR (MUHTEMELEN GAZ KOLU)',
    irtibatKisi: 'YASİN',
    telefon: '0 532 747 68 41',
    durum: 'PLANLANDI-RANDEVU',
  },
  {
    id: '2722',
    tarih: '03.02.2026',
    saat: '09:30',
    tekneAdi: 'CAT. LEMAN',
    adres: 'YATMARIN',
    yer: 'BETON YOL SOLU - HOŞYOLLAR T. CİVARI',
    servisAciklamasi: '4JH57 RUTİN VE SD60 ALT GRUP BAKIMI',
    irtibatKisi: 'ENES',
    telefon: '90 535 855 64 66',
    durum: 'PLANLANDI-RANDEVU',
  },
  {
    id: '2723',
    tarih: '03.02.2026',
    saat: '13:30',
    tekneAdi: 'DULCENIA',
    adres: 'YATMARIN',
    yer: 'DALGIÇ ARKASI',
    servisAciklamasi: 'Yanmar 6LYA-STP MOTOR KONTROLLERİ VE YAPILMASI GERKENLER TEKLİF',
    durum: 'PLANLANDI-RANDEVU',
  },
  {
    id: '2735',
    tekneAdi: 'SERENGETI',
    adres: 'YATMARIN',
    yer: 'KARA',
    servisAciklamasi: 'BESENZONI PASARELLA DEVAM',
    irtibatKisi: 'YUNUS ÖZTÜRK',
    telefon: '90 543 850 25 67',
    durum: 'DEVAM EDİYOR',
  },
  {
    id: '2747',
    tarih: '03.02.2026',
    saat: '13:30',
    tekneAdi: 'TOY STORY',
    adres: 'YATMARIN',
    yer: 'toprak sahada ortada',
    servisAciklamasi: 'OPACMARE PASARELLA ARIZA KONTROLLERİ - KONTROL PANEL İLE',
    irtibatKisi: 'KEMAL KAPTAN',
    telefon: '90 533 455 46 42',
    durum: 'PLANLANDI-RANDEVU',
  },
  {
    id: '2748',
    tekneAdi: 'CIPITOUBA II',
    adres: 'YATMARIN',
    yer: 'KARA',
    servisAciklamasi: 'JENERATÖR DEVAM',
    durum: 'DEVAM EDİYOR',
  },
  {
    id: '2749',
    tekneAdi: 'KISMET',
    adres: 'YATMARIN',
    yer: '',
    servisAciklamasi: 'MOTOR MONTAJI DEVAM',
    durum: 'DEVAM EDİYOR',
  },
  {
    id: '2750',
    tekneAdi: 'TEE DJE',
    adres: 'YATMARIN',
    yer: 'KARA',
    servisAciklamasi: 'TRAC STABILIZER PİSTON MONTAJLARI',
    durum: 'DEVAM EDİYOR',
  },
  {
    id: '2751',
    tekneAdi: 'OCEAN PEARL',
    adres: 'YATMARIN',
    yer: 'KARA',
    servisAciklamasi: 'LİSTELİ İŞLER DEVAM',
    durum: 'DEVAM EDİYOR',
  },
  {
    id: '2752',
    tekneAdi: 'M/V ANTHEYA III',
    adres: 'NETSEL',
    yer: 'YATMARIN',
    servisAciklamasi: 'TRAC 370 ATÖLYEDE TOPARLAMA İŞLERİ - ŞUBAT ORTASI TEKNE ÜSTÜ MONTAJ',
    durum: 'DEVAM EDİYOR',
  },
  {
    id: '2756',
    tarih: '03.02.2026',
    saat: '10:00',
    tekneAdi: 'ODYSSEY',
    adres: 'KARACASÖĞÜT',
    yer: 'GLOBAL SAILING',
    servisAciklamasi: 'YANMAR 4JH2-HTE MOTOR MAJÖR SERVİS SÖKÜMLERİ / TEKNE BOŞ OLABİLİR AMA AÇIK / GİREBİLİRSİNİZ - MÜMTAZ USTA İLE BAĞLANTI KURABİLİRSİNİZ. MÜMTAZ : 90 533 669 82 06',
    irtibatKisi: 'TEKNE SAHİBİ GÖKHAN BEY',
    telefon: '5333680141',
    durum: 'PLANLANDI-RANDEVU',
  },
];

// Durum mapping
const DURUM_MAP = {
  'PLANLANDI-RANDEVU': 'RANDEVU_VERILDI',
  'DEVAM EDİYOR': 'DEVAM_EDİYOR',
  'TAMAMLANDI': 'TAMAMLANDI',
  'PARCA BEKLIYOR': 'PARCA_BEKLIYOR',
  'MÜŞTERİ ONAY BEKLIYOR': 'MUSTERI_ONAY_BEKLIYOR',
};

/**
 * Tarihi DD.MM.YYYY formatından Date objesine çevirir
 */
function parseDate(tarih) {
  if (!tarih) return null;
  const [day, month, year] = tarih.split('.');
  return new Date(`${year}-${month}-${day}`);
}

/**
 * Ana import fonksiyonu
 */
async function importData() {
  console.log('🔄 Google Sheets verileri içe aktarılıyor...\n');
  console.log(`📊 Toplam ${SHEETS_DATA.length} servis kaydı işlenecek\n`);

  // 1. Benzersiz tekneleri çıkar
  const tekneMap = new Map();
  SHEETS_DATA.forEach(item => {
    if (item.tekneAdi && !tekneMap.has(item.tekneAdi)) {
      tekneMap.set(item.tekneAdi, {
        ad: item.tekneAdi,
        adres: item.adres,
        aktif: true,
      });
    }
  });

  const tekneler = Array.from(tekneMap.values());
  console.log(`🛥️ ${tekneler.length} benzersiz tekne tespit edildi:`);
  tekneler.forEach(t => console.log(`   - ${t.ad}`));
  console.log('');

  // 2. Tekneleri veritabanına ekle
  let createdTekneler = 0;
  for (const tekne of tekneler) {
    const existing = await prisma.tekne.findFirst({
      where: { ad: tekne.ad },
    });

    if (!existing) {
      await prisma.tekne.create({
        data: tekne,
      });
      createdTekneler++;
    }
  }
  console.log(`✅ ${createdTekneler} tekne veritabanına kaydedildi\n`);

  // 3. Servisleri ekle
  let createdServisler = 0;
  let updatedServisler = 0;
  let hataliServis = 0;

  for (const item of SHEETS_DATA) {
    try {
      // Tekne'yi bul
      const tekne = await prisma.tekne.findFirst({
        where: { ad: item.tekneAdi },
      });

      if (!tekne) {
        console.warn(`⚠️  Tekne bulunamadı: ${item.tekneAdi}`);
        hataliServis++;
        continue;
      }

      // Tarih parse
      const tarih = parseDate(item.tarih);

      // Durum çevir
      const durum = DURUM_MAP[item.durum] || 'RANDEVU_VERILDI';

      // Servis var mı kontrol et
      const existing = await prisma.servis.findUnique({
        where: { id: item.id },
      });

      const servisData = {
        id: item.id,
        tarih,
        saat: item.saat,
        tekneId: tekne.id,
        tekneAdi: tekne.ad,
        adres: item.adres,
        yer: item.yer,
        servisAciklamasi: item.servisAciklamasi,
        irtibatKisi: item.irtibatKisi || null,
        telefon: item.telefon || null,
        durum: durum,
        isTuru: 'PAKET',
      };

      if (existing) {
        // Güncelle
        await prisma.servis.update({
          where: { id: item.id },
          data: servisData,
        });
        updatedServisler++;
        console.log(`🔄 [${item.id}] ${item.tekneAdi} - ${item.durum} - GÜNCELLENDİ`);
      } else {
        // Yeni oluştur
        await prisma.servis.create({
          data: servisData,
        });
        createdServisler++;
        const tarihStr = item.tarih || 'Tarihsiz';
        console.log(`➕ [${item.id}] ${item.tekneAdi} - ${tarihStr} - ${item.durum} - YENİ`);
      }
    } catch (error) {
      console.error(`❌ [${item.id}] Hata:`, error.message);
      hataliServis++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 İÇE AKARMA RAPORU');
  console.log('='.repeat(60));
  console.log(`✅ Tekneler:         ${createdTekneler} adet`);
  console.log(`➕ Yeni Servisler:   ${createdServisler} adet`);
  console.log(`🔄 Güncellenen:      ${updatedServisler} adet`);
  console.log(`❌ Hatalı:           ${hataliServis} adet`);
  console.log('='.repeat(60));
  console.log(`🎉 Toplam: ${createdServisler + updatedServisler} servis işlendi!\n`);

  return {
    tekneler: createdTekneler,
    yeniServis: createdServisler,
    guncellenenServis: updatedServisler,
    hatali: hataliServis,
  };
}

// Script'i çalıştır
async function main() {
  try {
    const result = await importData();
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Kritik Hata:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
