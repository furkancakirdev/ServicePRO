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

  // Sample servisler (Job alias backlog foundation): minimum 10 kayit
  const now = new Date();
  const serviceSeedRows: Array<{
    id: string;
    tekneId: string;
    tekneAdi: string;
    isTuru: 'PAKET' | 'ARIZA' | 'PROJE';
    durum:
      | 'RANDEVU_VERILDI'
      | 'DEVAM_EDİYOR'
      | 'PARCA_BEKLIYOR'
      | 'MUSTERI_ONAY_BEKLIYOR'
      | 'TAMAMLANDI';
    offsetDays: number;
    saat: string;
    servisAciklamasi: string;
    adres: string;
    yer: string;
    telefon: string;
    sorumluPersonelId: string;
  }> = [
    {
      id: 'servis-1',
      tekneId: tekne1.id,
      tekneAdi: tekne1.ad,
      isTuru: 'PAKET',
      durum: 'DEVAM_EDİYOR',
      offsetDays: 0,
      saat: '09:00',
      servisAciklamasi: 'Rutin bakım kontrolü',
      adres: 'Yatmarin A Blok 1',
      yer: 'Yatmarin',
      telefon: '555-9999',
      sorumluPersonelId: personel1.id,
    },
    {
      id: 'servis-2',
      tekneId: tekne2.id,
      tekneAdi: tekne2.ad,
      isTuru: 'ARIZA',
      durum: 'RANDEVU_VERILDI',
      offsetDays: -1,
      saat: '10:30',
      servisAciklamasi: 'Motor onarımı',
      adres: 'Netsel B Blok 2',
      yer: 'Netsel',
      telefon: '555-8888',
      sorumluPersonelId: personel2.id,
    },
    {
      id: 'servis-3',
      tekneId: tekne1.id,
      tekneAdi: tekne1.ad,
      isTuru: 'PROJE',
      durum: 'TAMAMLANDI',
      offsetDays: -2,
      saat: '08:30',
      servisAciklamasi: 'Yazlık yükleme',
      adres: 'Yatmarin A Blok 1',
      yer: 'Yatmarin',
      telefon: '555-7777',
      sorumluPersonelId: personel2.id,
    },
    {
      id: 'servis-4',
      tekneId: tekne2.id,
      tekneAdi: tekne2.ad,
      isTuru: 'PAKET',
      durum: 'RANDEVU_VERILDI',
      offsetDays: 1,
      saat: '11:00',
      servisAciklamasi: 'Klima sezon bakımı',
      adres: 'Yatmarin C Iskele 4',
      yer: 'Yatmarin',
      telefon: '555-1004',
      sorumluPersonelId: personel1.id,
    },
    {
      id: 'servis-5',
      tekneId: tekne1.id,
      tekneAdi: tekne1.ad,
      isTuru: 'ARIZA',
      durum: 'PARCA_BEKLIYOR',
      offsetDays: 2,
      saat: '13:30',
      servisAciklamasi: 'Elektrik arıza tespiti',
      adres: 'Netsel D Iskele 2',
      yer: 'Netsel',
      telefon: '555-1005',
      sorumluPersonelId: personel2.id,
    },
    {
      id: 'servis-6',
      tekneId: tekne2.id,
      tekneAdi: tekne2.ad,
      isTuru: 'PROJE',
      durum: 'MUSTERI_ONAY_BEKLIYOR',
      offsetDays: 3,
      saat: '15:00',
      servisAciklamasi: 'Jeneratör revizyon teklifi',
      adres: 'Dis Servis Marmaris Merkez',
      yer: 'Dis Servis',
      telefon: '555-1006',
      sorumluPersonelId: personel1.id,
    },
    {
      id: 'servis-7',
      tekneId: tekne1.id,
      tekneAdi: tekne1.ad,
      isTuru: 'PAKET',
      durum: 'RANDEVU_VERILDI',
      offsetDays: 4,
      saat: '09:15',
      servisAciklamasi: 'Periyodik bakım seti',
      adres: 'Yatmarin B Iskele 1',
      yer: 'Yatmarin',
      telefon: '555-1007',
      sorumluPersonelId: personel2.id,
    },
    {
      id: 'servis-8',
      tekneId: tekne2.id,
      tekneAdi: tekne2.ad,
      isTuru: 'ARIZA',
      durum: 'DEVAM_EDİYOR',
      offsetDays: -3,
      saat: '14:45',
      servisAciklamasi: 'Hidrolik pompa bakımı',
      adres: 'Netsel E Iskele 8',
      yer: 'Netsel',
      telefon: '555-1008',
      sorumluPersonelId: personel1.id,
    },
    {
      id: 'servis-9',
      tekneId: tekne1.id,
      tekneAdi: tekne1.ad,
      isTuru: 'PROJE',
      durum: 'RANDEVU_VERILDI',
      offsetDays: 5,
      saat: '12:15',
      servisAciklamasi: 'Yeni ekipman montajı',
      adres: 'Dis Servis Bozburun',
      yer: 'Dis Servis',
      telefon: '555-1009',
      sorumluPersonelId: personel2.id,
    },
    {
      id: 'servis-10',
      tekneId: tekne2.id,
      tekneAdi: tekne2.ad,
      isTuru: 'PAKET',
      durum: 'RANDEVU_VERILDI',
      offsetDays: 6,
      saat: '16:00',
      servisAciklamasi: 'Yaz sonu genel bakım',
      adres: 'Yatmarin F Iskele 6',
      yer: 'Yatmarin',
      telefon: '555-1010',
      sorumluPersonelId: personel1.id,
    },
  ];

  for (const row of serviceSeedRows) {
    const tarih = new Date(now);
    tarih.setDate(now.getDate() + row.offsetDays);
    tarih.setHours(12, 0, 0, 0);

    const servis = await prisma.service.upsert({
      where: { id: row.id },
      update: {
        tekneId: row.tekneId,
        tekneAdi: row.tekneAdi,
        isTuru: row.isTuru,
        durum: row.durum,
        tarih,
        saat: row.saat,
        servisAciklamasi: row.servisAciklamasi,
        adres: row.adres,
        yer: row.yer,
        telefon: row.telefon,
        ofisYetkiliId: admin.id,
        deletedAt: null,
      },
      create: {
        id: row.id,
        tekneId: row.tekneId,
        tekneAdi: row.tekneAdi,
        isTuru: row.isTuru,
        durum: row.durum,
        tarih,
        saat: row.saat,
        servisAciklamasi: row.servisAciklamasi,
        adres: row.adres,
        yer: row.yer,
        telefon: row.telefon,
        ofisYetkiliId: admin.id,
      },
    });

    await prisma.servicePersonel.upsert({
      where: {
        servisId_personelId: {
          servisId: servis.id,
          personelId: row.sorumluPersonelId,
        },
      },
      update: { rol: 'SORUMLU' },
      create: {
        servisId: servis.id,
        personelId: row.sorumluPersonelId,
        rol: 'SORUMLU',
      },
    });
  }
  console.log(`✅ Sample servisler created: ${serviceSeedRows.length} kayıt`);

  // Appointment seed (Sprint 1 foundation): minimum 15 randevu
  const toUtcFromTr = (dayOffset: number, hourTr: number, minuteTr: number) => {
    const date = new Date(now);
    date.setUTCDate(now.getUTCDate() + dayOffset);
    date.setUTCHours(hourTr - 3, minuteTr, 0, 0);
    return date;
  };

  const appointmentSeedRows: Array<{
    id: string;
    servisId: string;
    personelId: string;
    dayOffset: number;
    startHourTr: number;
    startMinuteTr: number;
    durationHour: number;
    status: 'PLANLANDI' | 'ONAY_BEKLIYOR' | 'ONAYLANDI' | 'BASLADI' | 'TAMAMLANDI';
    notlar: string;
    sira: number;
  }> = [
    { id: 'appointment-1', servisId: 'servis-1', personelId: personel1.id, dayOffset: 0, startHourTr: 9, startMinuteTr: 0, durationHour: 2, status: 'PLANLANDI', notlar: 'İlk kontrol ziyareti', sira: 0 },
    { id: 'appointment-2', servisId: 'servis-2', personelId: personel2.id, dayOffset: -1, startHourTr: 10, startMinuteTr: 30, durationHour: 2, status: 'ONAYLANDI', notlar: 'Arıza ön teşhis', sira: 0 },
    { id: 'appointment-3', servisId: 'servis-3', personelId: personel2.id, dayOffset: -2, startHourTr: 8, startMinuteTr: 30, durationHour: 3, status: 'TAMAMLANDI', notlar: 'Tamamlanan proje ziyareti', sira: 0 },
    { id: 'appointment-4', servisId: 'servis-4', personelId: personel1.id, dayOffset: 1, startHourTr: 11, startMinuteTr: 0, durationHour: 2, status: 'PLANLANDI', notlar: 'Periyodik bakım', sira: 0 },
    { id: 'appointment-5', servisId: 'servis-5', personelId: personel2.id, dayOffset: 2, startHourTr: 13, startMinuteTr: 30, durationHour: 2, status: 'ONAY_BEKLIYOR', notlar: 'Parça bekleme sonrası kontrol', sira: 0 },
    { id: 'appointment-6', servisId: 'servis-6', personelId: personel1.id, dayOffset: 3, startHourTr: 15, startMinuteTr: 0, durationHour: 2, status: 'PLANLANDI', notlar: 'Keşif ve teklif ziyareti', sira: 0 },
    { id: 'appointment-7', servisId: 'servis-7', personelId: personel2.id, dayOffset: 4, startHourTr: 9, startMinuteTr: 15, durationHour: 2, status: 'PLANLANDI', notlar: 'Bakım seti uygulama', sira: 0 },
    { id: 'appointment-8', servisId: 'servis-8', personelId: personel1.id, dayOffset: -3, startHourTr: 14, startMinuteTr: 45, durationHour: 2, status: 'BASLADI', notlar: 'Sahada aktif iş', sira: 0 },
    { id: 'appointment-9', servisId: 'servis-9', personelId: personel2.id, dayOffset: 5, startHourTr: 12, startMinuteTr: 15, durationHour: 2, status: 'PLANLANDI', notlar: 'Montaj öncesi hazırlık', sira: 0 },
    { id: 'appointment-10', servisId: 'servis-10', personelId: personel1.id, dayOffset: 6, startHourTr: 16, startMinuteTr: 0, durationHour: 2, status: 'PLANLANDI', notlar: 'Yaz sonu bakım ziyareti', sira: 0 },
    { id: 'appointment-11', servisId: 'servis-1', personelId: personel1.id, dayOffset: 1, startHourTr: 9, startMinuteTr: 0, durationHour: 1, status: 'ONAY_BEKLIYOR', notlar: 'Takip randevusu', sira: 1 },
    { id: 'appointment-12', servisId: 'servis-2', personelId: personel2.id, dayOffset: 0, startHourTr: 11, startMinuteTr: 0, durationHour: 1, status: 'PLANLANDI', notlar: 'Parça test randevusu', sira: 1 },
    { id: 'appointment-13', servisId: 'servis-5', personelId: personel2.id, dayOffset: 3, startHourTr: 10, startMinuteTr: 0, durationHour: 2, status: 'PLANLANDI', notlar: 'Parça teslim sonrası işçilik', sira: 1 },
    { id: 'appointment-14', servisId: 'servis-6', personelId: personel1.id, dayOffset: 4, startHourTr: 13, startMinuteTr: 0, durationHour: 2, status: 'PLANLANDI', notlar: 'Teklif revizyon ziyareti', sira: 1 },
    { id: 'appointment-15', servisId: 'servis-9', personelId: personel2.id, dayOffset: 7, startHourTr: 9, startMinuteTr: 30, durationHour: 2, status: 'PLANLANDI', notlar: 'Montaj kapanış ziyareti', sira: 1 },
  ];

  for (const row of appointmentSeedRows) {
    const baslangicAt = toUtcFromTr(row.dayOffset, row.startHourTr, row.startMinuteTr);
    const bitisAt = new Date(baslangicAt.getTime() + row.durationHour * 60 * 60 * 1000);
    await prisma.appointment.upsert({
      where: { id: row.id },
      update: {
        servisId: row.servisId,
        personelId: row.personelId,
        baslangicAt,
        bitisAt,
        status: row.status,
        notlar: row.notlar,
        sira: row.sira,
        kilitli: false,
        deletedAt: null,
      },
      create: {
        id: row.id,
        servisId: row.servisId,
        personelId: row.personelId,
        baslangicAt,
        bitisAt,
        status: row.status,
        notlar: row.notlar,
        sira: row.sira,
      },
    });
  }
  console.log(`✅ Sample appointments created: ${appointmentSeedRows.length} kayıt`);

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




