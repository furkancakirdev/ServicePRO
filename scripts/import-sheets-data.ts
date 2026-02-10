/**
 * Google Sheets Veri Import Script
 * Mevcut servis verilerini PostgreSQL'e import eder
 *
 * Kullanım: npx ts-node scripts/import-sheets-data.ts
 */

import { prisma } from '../lib/prisma';

// Google Sheets'ten okunan ham veriler
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
    irtibatKisi: null,
    telefon: null,
    durum: 'PLANLANDI-RANDEVU',
  },
  {
    id: '2735',
    tarih: null,
    saat: null,
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
    tarih: null,
    saat: null,
    tekneAdi: 'CIPITOUBA II',
    adres: 'YATMARIN',
    yer: 'KARA',
    servisAciklamasi: 'JENERATÖR DEVAM',
    irtibatKisi: null,
    telefon: null,
    durum: 'DEVAM EDİYOR',
  },
  {
    id: '2749',
    tarih: null,
    saat: null,
    tekneAdi: 'KISMET',
    adres: 'YATMARIN',
    yer: '',
    servisAciklamasi: 'MOTOR MONTAJI DEVAM',
    irtibatKisi: null,
    telefon: null,
    durum: 'DEVAM EDİYOR',
  },
  {
    id: '2750',
    tarih: null,
    saat: null,
    tekneAdi: 'TEE DJE',
    adres: 'YATMARIN',
    yer: 'KARA',
    servisAciklamasi: 'TRAC STABILIZER PİSTON MONTAJLARI',
    irtibatKisi: null,
    telefon: null,
    durum: 'DEVAM EDİYOR',
  },
  {
    id: '2751',
    tarih: null,
    saat: null,
    tekneAdi: 'OCEAN PEARL',
    adres: 'YATMARIN',
    yer: 'KARA',
    servisAciklamasi: 'LİSTELİ İŞLER DEVAM',
    irtibatKisi: null,
    telefon: null,
    durum: 'DEVAM EDİYOR',
  },
  {
    id: '2752',
    tarih: null,
    saat: null,
    tekneAdi: 'M/V ANTHEYA III',
    adres: 'NETSEL',
    yer: 'YATMARIN',
    servisAciklamasi: 'TRAC 370 ATÖLYEDE TOPARLAMA İŞLERİ - ŞUBAT ORTASI TEKNE ÜSTÜ MONTAJ',
    irtibatKisi: null,
    telefon: null,
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
const DURUM_MAP: Record<string, string> = {
  'PLANLANDI-RANDEVU': 'RANDEVU_VERILDI',
  'DEVAM EDİYOR': 'DEVAM_EDİYOR',
  'TAMAMLANDI': 'TAMAMLANDI',
  'PARCA BEKLIYOR': 'PARCA_BEKLIYOR',
  'MÜŞTERİ ONAY BEKLIYOR': 'MUSTERI_ONAY_BEKLIYOR',
};

/**
 * Tarihi DD.MM.YYYY formatından Date objesine çevirir
 */
function parseDate(tarih: string | null): Date | null {
  if (!tarih) return null;

  const [day, month, year] = tarih.split('.');
  return new Date(`${year}-${month}-${day}`);
}

/**
 * Ana import fonksiyonu
 */
async function importData() {
  console.log('🔄 Google Sheets verileri içe aktarılıyor...\n');

  // 1. Benzersiz tekneleri çıkar
  const tekneMap = new Map<string, any>();
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
  console.log(`🛥️ ${tekneler.length} benzersiz tekne tespit edildi`);

  // 2. Tekneleri veritabanına ekle
  let createdTekneler = 0;
  for (const tekne of tekneler) {
    // Önce tekne adına göre ara
    const existingTekne = await prisma.tekne.findFirst({
      where: { ad: tekne.ad },
    });
    
    if (existingTekne) {
      // Güncelle
      await prisma.tekne.update({
        where: { id: existingTekne.id },
        data: {},
      });
    } else {
      // Yeni oluştur
      await prisma.tekne.create({
        data: tekne,
      });
    }
    createdTekneler++;
  }
  console.log(`✅ ${createdTekneler} tekne veritabanına kaydedildi\n`);

  // 3. Servisleri ekle
  let createdServisler = 0;
  let updatedServisler = 0;

  for (const item of SHEETS_DATA) {
    // Tekne'yi bul
    const tekne = await prisma.tekne.findFirst({
      where: { ad: item.tekneAdi },
    });

    if (!tekne) {
      console.warn(`⚠️ Tekne bulunamadı: ${item.tekneAdi}`);
      continue;
    }

    // Tarih parse
    const tarih = parseDate(item.tarih);

    // Durum çevir
    const durum = DURUM_MAP[item.durum] || 'RANDEVU_VERILDI';

    // Servis var mı kontrol et
    const existing = await prisma.service.findUnique({
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
      irtibatKisi: item.irtibatKisi,
      telefon: item.telefon,
      durum: durum as any,
      isTuru: 'PAKET' as const,
    };

    if (existing) {
      // Güncelle
      await prisma.service.update({
        where: { id: item.id },
        data: servisData as any,
      });
      updatedServisler++;
      console.log(`🔄 Güncellendi: ${item.id} - ${item.tekneAdi}`);
    } else {
      // Yeni oluştur
      await prisma.service.create({
        data: servisData as any,
      });
      createdServisler++;
      console.log(`➕ Yeni: ${item.id} - ${item.tekneAdi} (${item.durum})`);
    }
  }

  console.log(`\n✅ ${createdServisler} yeni servis oluşturuldu`);
  console.log(`🔄 ${updatedServisler} servis güncellendi`);
  console.log('\n🎉 İçe aktarma tamamlandı!\n');

  return {
    tekneler: createdTekneler,
    yeniServis: createdServisler,
    guncellenenServis: updatedServisler,
  };
}

// Script'i çalıştır
async function main() {
  try {
    const result = await importData();
    console.log('📊 Özet:', result);
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

main();
