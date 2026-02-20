import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@servicepro.com' },
    update: {},
    create: {
      email: 'admin@servicepro.com',
      passwordHash: adminPassword,
      ad: 'Admin User',
      role: 'ADMIN',
      aktif: true,
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Yetkili (Koordinatör) kullanıcılar - 4 WHITELISTED YETKILI
  const yetkiliPassword = await bcrypt.hash('yetkili123', 12);
  const yetkililer = [
    { email: 'furkan.cakir@marlin.com.tr', ad: 'Furkan ÇAKIR' },
    { email: 'mehmet@marlin.com.tr', ad: 'Mehmet KARA' },
    { email: 'tugrul.semiz@marlin.com.tr', ad: 'Tuğrul SEMİZ' },
    { email: 'burak@marlin.com.tr', ad: 'Burak ÇETİNEL' },
  ];

  for (const yetkili of yetkililer) {
    await prisma.user.upsert({
      where: { email: yetkili.email },
      update: { whitelistedYetkili: true },
      create: {
        email: yetkili.email,
        passwordHash: yetkiliPassword,
        ad: yetkili.ad,
        role: 'YETKILI',
        aktif: true,
        whitelistedYetkili: true, // YENİ: 4 yetkili whitelist kontrolü
      },
    });
  }
  console.log('✅ 4 Whitelisted yetkili kullanıcılar oluşturuldu');

  // Zorluk Katsayıları
  const katsayilar = [
    { isTuru: 'PAKET' as const, label: 'Rutin-Basit Servis', carpan: 1.0 },
    { isTuru: 'ARIZA' as const, label: 'Arıza Çözüm', carpan: 1.2 },
    { isTuru: 'PROJE' as const, label: 'Proje-Büyük Servis', carpan: 1.5 },
  ];

  for (const katsayi of katsayilar) {
    await prisma.zorlukKatsayi.upsert({
      where: { isTuru: katsayi.isTuru },
      update: { label: katsayi.label, carpan: katsayi.carpan },
      create: katsayi,
    });
  }
  console.log('✅ Zorluk katsayıları oluşturuldu');

  // Rozet Kriterleri
  const rozetKriterleri = [
    { rozet: 'ALTIN' as const, siralama: 1 },
    { rozet: 'GUMUS' as const, siralama: 2 },
    { rozet: 'BRONZ' as const, siralama: 3 },
  ];

  for (const kriter of rozetKriterleri) {
    await prisma.rozetKriteri.upsert({
      where: { rozet: kriter.rozet },
      update: { siralama: kriter.siralama },
      create: kriter,
    });
  }
  console.log('✅ Rozet kriterleri oluşturuldu');

  // Puanlama Soruları - USTA
  const ustaSorulari = [
    { key: 'uniformaVeIsg', label: 'Üniforma ve İSG Uyumu', aciklama: 'Personel iş güvenliği ekipmanlarını (KKD) kullandı mı? Üniforma temiz ve düzgün müydü?', sira: 1 },
    { key: 'musteriIletisimi', label: 'Müşteri İletişim Kalitesi', aciklama: 'Müşterilerle profesyonel ve saygılı iletişim kurdu mu? Şikayet aldı mı?', sira: 2 },
    { key: 'planlamaKoordinasyon', label: 'Planlama ve Koordinasyon', aciklama: 'İş planına uydu mu? Değişiklikleri zamanında bildirdi mi?', sira: 3 },
    { key: 'teknikTespit', label: 'Teknik Tespit Yeteneği', aciklama: 'Arızaları ve ek iş ihtiyaçlarını doğru tespit edebildi mi?', sira: 4 },
    { key: 'raporDokumantasyon', label: 'Rapor ve Dokümantasyon', aciklama: 'İş raporlarını eksiksiz ve zamanında teslim etti mi?', sira: 5 },
    { key: 'genelLiderlik', label: 'Genel Liderlik', aciklama: 'Ekibini yönetti mi? Çıraklara rehberlik etti mi? Sorumluluk aldı mı?', sira: 6 },
  ];

  for (const soru of ustaSorulari) {
    await prisma.puanlamaSoru.upsert({
      where: { key: soru.key },
      update: { label: soru.label, aciklama: soru.aciklama, sira: soru.sira },
      create: { ...soru, kategori: 'USTA', raporKontrolMu: false, zorunluMu: true },
    });
  }

  // Puanlama Soruları - CIRAK
  const cirakSorulari = [
    { key: 'cirak_uniformaVeIsg', label: 'Üniforma ve İSG Uyumu', aciklama: 'Personel iş güvenliği ekipmanlarını (KKD) kullandı mı? Üniforma temiz ve düzgün müydü?', sira: 1 },
    { key: 'ekipIciDavranis', label: 'Ekip İçi Davranış', aciklama: 'Ekip arkadaşlarıyla uyumlu çalıştı mı? Çatışma veya tutum problemi var mıydı?', sira: 2 },
    { key: 'destekKalitesi', label: 'Ustalara Destek Kalitesi', aciklama: 'Ustalara verilen görevlerde yardımcı oldu mu? Talimatlara uydu mu?', sira: 3 },
    { key: 'ogrenmeGelisim', label: 'Öğrenme İsteği ve Gelişim', aciklama: 'Bu ay yeni bir şey öğrendi mi? Soru sordu mu? İlerleme kaydetti mi?', sira: 4 },
  ];

  for (const soru of cirakSorulari) {
    await prisma.puanlamaSoru.upsert({
      where: { key: soru.key },
      update: { label: soru.label, aciklama: soru.aciklama, sira: soru.sira },
      create: { ...soru, kategori: 'CIRAK', raporKontrolMu: false, zorunluMu: true },
    });
  }

  // YENİ: Rapor Kontrol Soruları - Servis kapanışında kullanılır
  const raporKontrolSorulari = [
    { key: 'seriNoVar', label: 'Ünite Seri No', aciklama: 'Ünite seri numarası raporda mevcut mu?', sira: 1 },
    { key: 'fotografVar', label: 'Fotoğraf', aciklama: 'İşten fotoğraf mevcut mu?', sira: 2 },
    { key: 'aciklamaVar', label: 'Açıklama', aciklama: 'Yapılan iş açıklaması yeterli mi?', sira: 3 },
    { key: 'saatVar', label: 'Adam/Saat', aciklama: 'Harcanan süre belirtilmiş mi?', sira: 4 },
  ];

  for (const soru of raporKontrolSorulari) {
    await prisma.puanlamaSoru.upsert({
      where: { key: soru.key },
      update: { label: soru.label, aciklama: soru.aciklama, sira: soru.sira },
      create: { ...soru, kategori: 'GENEL', raporKontrolMu: true, zorunluMu: true, isTuruFilter: null },
    });
  }
  console.log('✅ Puanlama soruları ve rapor kontrol soruları oluşturuldu');

  // Sample tekneler
  const tekne1 = await prisma.tekne.upsert({
    where: { id: 'tekne-1' },
    update: {},
    create: {
      id: 'tekne-1',
      ad: 'M/V Sea Breeze',
      seriNo: 'TR-1234',
      marka: 'Bavaria',
      model: 'Cruiser',
      boyut: 15,
      motorTipi: 'Diesel',
      aktif: true,
    },
  });

  const tekne2 = await prisma.tekne.upsert({
    where: { id: 'tekne-2' },
    update: {},
    create: {
      id: 'tekne-2',
      ad: 'M/V Ocean Star',
      seriNo: 'TR-5678',
      marka: 'Beneteau',
      model: 'Oceanis',
      boyut: 20,
      motorTipi: 'Diesel',
      aktif: true,
    },
  });
  console.log('✅ Sample tekneler created');

  // Canonical Personel Listesi - Product gereksinimine göre sabitlendi
  const personelListesi = [
    { ad: 'Ali Can Yaylalı', unvan: 'USTA' },
    { ad: 'Batuhan Batmaz', unvan: 'CIRAK' },
    { ad: 'Berkay Yalçınkaya', unvan: 'CIRAK' },
    { ad: 'Cüneyt Yaylalı', unvan: 'USTA' },
    { ad: 'Emre Kaya', unvan: 'CIRAK' },
    { ad: 'Erhan Turhan', unvan: 'USTA' },
    { ad: 'Halil İbrahim Duru', unvan: 'CIRAK' },
    { ad: 'İbrahim Yayalık', unvan: 'USTA' },
    { ad: 'İbrahim Yaylalı', unvan: 'USTA' },
    { ad: 'Mehmet Bacak', unvan: 'CIRAK' },
    { ad: 'Mehmet Güven', unvan: 'USTA' },
    { ad: 'Mekselina Kebabçı', unvan: 'CIRAK' },
    { ad: 'Melih Çoban', unvan: 'CIRAK' },
    { ad: 'Muhammed Bacak', unvan: 'CIRAK' },
    { ad: 'Ömer Bidan', unvan: 'CIRAK' },
    { ad: 'Sercan Sarıyöz', unvan: 'USTA' },
    { ad: 'Volkan Özkan', unvan: 'CIRAK' },
  ];

  for (let i = 0; i < personelListesi.length; i++) {
    const p = personelListesi[i];
    await prisma.personel.upsert({
      where: { id: `personel-${i + 1}` },
      update: { ad: p.ad, unvan: p.unvan as 'USTA' | 'CIRAK', rol: 'teknisyen', aktif: true, deletedAt: null },
      create: {
        id: `personel-${i + 1}`,
        ad: p.ad,
        unvan: p.unvan as 'USTA' | 'CIRAK',
        rol: 'teknisyen',
        aktif: true,
      },
    });
  }

  // Listedeki personeller dışında kalan demo/eski kayıtları pasife çek
  await prisma.personel.updateMany({
    where: {
      id: { notIn: personelListesi.map((_, i) => `personel-${i + 1}`) },
      deletedAt: null,
    },
    data: {
      aktif: false,
      deletedAt: new Date(),
    },
  });

  console.log('17 personel olusturuldu ve demo kayitlar pasife alindi');

  // Referans için personel değişkenleri
  const personel1 = await prisma.personel.findUnique({ where: { id: 'personel-1' } });
  const personel2 = await prisma.personel.findUnique({ where: { id: 'personel-2' } });

  if (!personel1 || !personel2) {
    console.error('❌ Personel bulunamadı');
    return;
  }

  // Sample servisler
  const servis1 = await prisma.service.upsert({
    where: { id: 'servis-1' },
    update: {},
    create: {
      id: 'servis-1',
      tekneId: tekne1.id,
      tekneAdi: tekne1.ad,
      isTuru: 'PAKET',
      durum: 'DEVAM_EDİYOR',
      tarih: new Date(),
      servisAciklamasi: 'Rutin bakım kontrolü',
      adres: 'Marina A, Blok 1',
      yer: 'Yatmarin',
      telefon: '555-9999',
      ofisYetkiliId: admin.id,
    },
  });

  await prisma.servicePersonel.upsert({
    where: {
      servisId_personelId: {
        servisId: servis1.id,
        personelId: personel1.id,
      },
    },
    update: {},
    create: {
      servisId: servis1.id,
      personelId: personel1.id,
      rol: 'SORUMLU',
    },
  });

  const servis2 = await prisma.service.upsert({
    where: { id: 'servis-2' },
    update: {},
    create: {
      id: 'servis-2',
      tekneId: tekne2.id,
      tekneAdi: tekne2.ad,
      isTuru: 'ARIZA',
      durum: 'RANDEVU_VERILDI',
      tarih: new Date(Date.now() - 86400000),
      servisAciklamasi: 'Motor onarımı',
      adres: 'Marina B, Blok 2',
      yer: 'Netsel',
      telefon: '555-8888',
      ofisYetkiliId: admin.id,
    },
  });

  await prisma.servicePersonel.upsert({
    where: {
      servisId_personelId: {
        servisId: servis2.id,
        personelId: personel2.id,
      },
    },
    update: {},
    create: {
      servisId: servis2.id,
      personelId: personel2.id,
      rol: 'SORUMLU',
    },
  });

  const servis3 = await prisma.service.upsert({
    where: { id: 'servis-3' },
    update: {},
    create: {
      id: 'servis-3',
      tekneId: tekne1.id,
      tekneAdi: tekne1.ad,
      isTuru: 'PROJE',
      durum: 'TAMAMLANDI',
      tarih: new Date(Date.now() - 172800000),
      servisAciklamasi: 'Yazlık yükleme',
      adres: 'Marina A, Blok 1',
      yer: 'Yatmarin',
      telefon: '555-7777',
      ofisYetkiliId: admin.id,
    },
  });

  await prisma.servicePersonel.upsert({
    where: {
      servisId_personelId: {
        servisId: servis3.id,
        personelId: personel2.id,
      },
    },
    update: {},
    create: {
      servisId: servis3.id,
      personelId: personel2.id,
      rol: 'SORUMLU',
    },
  });
  console.log('✅ Sample servisler created');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });




