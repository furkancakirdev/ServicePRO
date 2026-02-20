import { Prisma } from '@prisma/client';
import { getLokasyonGroupFromFields, normalizeServisDurumuForApp } from '@/lib/domain-mappers';
import prisma from '@/lib/prisma';

type VarsayilanDurum = {
  key: string;
  label: string;
  description: string;
  color: string;
  icon: string;
  sirasi: number;
};

type VarsayilanKonum = {
  key: string;
  label: string;
  adres: string | null;
  telefon: string | null;
  sirasi: number;
};

type VarsayilanUnvan = {
  key: string;
  label: string;
  puanCarpani: number;
  sirasi: number;
};

const VARSAYILAN_DURUMLAR: VarsayilanDurum[] = [
  {
    key: 'RANDEVU_VERILDI',
    label: 'Randevu Verildi',
    description: 'Servis planlandı ve tarih verildi.',
    color: '#0ea5e9',
    icon: 'calendar',
    sirasi: 1,
  },
  {
    key: 'DEVAM_EDIYOR',
    label: 'Devam Ediyor',
    description: 'Servis aktif olarak devam ediyor.',
    color: '#22c55e',
    icon: 'wrench',
    sirasi: 2,
  },
  {
    key: 'PARCA_BEKLIYOR',
    label: 'Parça Bekliyor',
    description: 'Parça tedariki bekleniyor.',
    color: '#f59e0b',
    icon: 'package',
    sirasi: 3,
  },
  {
    key: 'MUSTERI_ONAY_BEKLIYOR',
    label: 'Müşteri Onay Bekliyor',
    description: 'Müşteri onayı beklenen servis.',
    color: '#f97316',
    icon: 'user-check',
    sirasi: 4,
  },
  {
    key: 'RAPOR_BEKLIYOR',
    label: 'Rapor Bekliyor',
    description: 'Kapanış raporu tamamlanmayı bekliyor.',
    color: '#3b82f6',
    icon: 'file-text',
    sirasi: 5,
  },
  {
    key: 'KESIF_KONTROL',
    label: 'Keşif / Kontrol',
    description: 'Ön keşif veya teknik kontrol aşaması.',
    color: '#a855f7',
    icon: 'search',
    sirasi: 6,
  },
  {
    key: 'TAMAMLANDI',
    label: 'Tamamlandı',
    description: 'Servis tamamlandı.',
    color: '#64748b',
    icon: 'check-circle',
    sirasi: 7,
  },
  {
    key: 'IPTAL',
    label: 'İptal',
    description: 'Servis iptal edildi.',
    color: '#ef4444',
    icon: 'x-circle',
    sirasi: 8,
  },
  {
    key: 'ERTELENDI',
    label: 'Ertelendi',
    description: 'Servis ileri tarihe ertelendi.',
    color: '#eab308',
    icon: 'pause-circle',
    sirasi: 9,
  },
];

const VARSAYILAN_KONUMLAR: VarsayilanKonum[] = [
  {
    key: 'YATMARIN',
    label: 'Yatmarin (Merkez)',
    adres: null,
    telefon: null,
    sirasi: 1,
  },
  {
    key: 'NETSEL',
    label: 'Netsel',
    adres: null,
    telefon: null,
    sirasi: 2,
  },
  {
    key: 'DIS_SERVIS',
    label: 'Dış Servis',
    adres: null,
    telefon: null,
    sirasi: 3,
  },
];

const VARSAYILAN_UNVANLAR: VarsayilanUnvan[] = [
  { key: 'USTA', label: 'Usta', puanCarpani: 1.0, sirasi: 1 },
  { key: 'CIRAK', label: 'Çırak', puanCarpani: 1.0, sirasi: 2 },
  { key: 'YONETICI', label: 'Yönetici', puanCarpani: 1.0, sirasi: 3 },
  { key: 'OFIS', label: 'Ofis', puanCarpani: 1.0, sirasi: 4 },
];

function anahtarNormalizeEt(deger: string): string {
  return deger
    .replace(/[İI]/g, 'I')
    .replace(/[ı]/g, 'I')
    .replace(/[Ğ]/g, 'G')
    .replace(/[ğ]/g, 'G')
    .replace(/[Ü]/g, 'U')
    .replace(/[ü]/g, 'U')
    .replace(/[Ş]/g, 'S')
    .replace(/[ş]/g, 'S')
    .replace(/[Ö]/g, 'O')
    .replace(/[ö]/g, 'O')
    .replace(/[Ç]/g, 'C')
    .replace(/[ç]/g, 'C')
    .replace(/\s+/g, '_')
    .toUpperCase()
    .trim();
}

function servisDurumAnahtariGetir(hamDurum: string): string {
  const appDurumu = normalizeServisDurumuForApp(hamDurum);
  return anahtarNormalizeEt(appDurumu);
}

export type DinamikMigrationOzeti = {
  durumUpsertSayisi: number;
  konumUpsertSayisi: number;
  unvanUpsertSayisi: number;
  servisDurumEslestirilen: number;
  servisKonumEslestirilen: number;
  personelUnvanEslestirilen: number;
  eksikDurumAnahtarlari: string[];
  eksikKonumAnahtarlari: string[];
  eksikUnvanAnahtarlari: string[];
};

export async function migrateHardcodedToDynamic(): Promise<DinamikMigrationOzeti> {
  return prisma.$transaction(async (tx) => {
    const durumIdHaritasi = new Map<string, string>();
    const konumIdHaritasi = new Map<string, string>();
    const unvanIdHaritasi = new Map<string, string>();

    for (const durum of VARSAYILAN_DURUMLAR) {
      const kayit = await tx.servisDurumuAyar.upsert({
        where: { key: durum.key },
        update: {
          label: durum.label,
          description: durum.description,
          color: durum.color,
          icon: durum.icon,
          sirasi: durum.sirasi,
          aktif: true,
        },
        create: {
          key: durum.key,
          label: durum.label,
          description: durum.description,
          color: durum.color,
          icon: durum.icon,
          sirasi: durum.sirasi,
          aktif: true,
        },
      });

      durumIdHaritasi.set(anahtarNormalizeEt(kayit.key), kayit.id);
    }

    for (const konum of VARSAYILAN_KONUMLAR) {
      const kayit = await tx.konum.upsert({
        where: { key: konum.key },
        update: {
          label: konum.label,
          adres: konum.adres,
          telefon: konum.telefon,
          sirasi: konum.sirasi,
          aktif: true,
        },
        create: {
          key: konum.key,
          label: konum.label,
          adres: konum.adres,
          telefon: konum.telefon,
          sirasi: konum.sirasi,
          aktif: true,
        },
      });

      konumIdHaritasi.set(anahtarNormalizeEt(kayit.key), kayit.id);
    }

    for (const unvan of VARSAYILAN_UNVANLAR) {
      const kayit = await tx.personelUnvanAyar.upsert({
        where: { key: unvan.key },
        update: {
          label: unvan.label,
          puanCarpani: new Prisma.Decimal(unvan.puanCarpani),
          sirasi: unvan.sirasi,
          aktif: true,
        },
        create: {
          key: unvan.key,
          label: unvan.label,
          puanCarpani: new Prisma.Decimal(unvan.puanCarpani),
          sirasi: unvan.sirasi,
          aktif: true,
        },
      });

      unvanIdHaritasi.set(anahtarNormalizeEt(kayit.key), kayit.id);
    }

    const servisler = await tx.service.findMany({
      select: {
        id: true,
        durum: true,
        durumId: true,
        yer: true,
        adres: true,
        konumId: true,
      },
    });

    let servisDurumEslestirilen = 0;
    let servisKonumEslestirilen = 0;

    for (const servis of servisler) {
      const guncellenecekDurumId =
        !servis.durumId
          ? durumIdHaritasi.get(servisDurumAnahtariGetir(String(servis.durum))) ?? null
          : null;
      const guncellenecekKonumId =
        !servis.konumId
          ? konumIdHaritasi.get(anahtarNormalizeEt(getLokasyonGroupFromFields(servis.yer, servis.adres))) ??
            null
          : null;

      if (!guncellenecekDurumId && !guncellenecekKonumId) {
        continue;
      }

      await tx.service.update({
        where: { id: servis.id },
        data: {
          ...(guncellenecekDurumId
            ? {
                durumAyari: {
                  connect: { id: guncellenecekDurumId },
                },
              }
            : {}),
          ...(guncellenecekKonumId
            ? {
                konumAyari: {
                  connect: { id: guncellenecekKonumId },
                },
              }
            : {}),
        },
      });

      if (guncellenecekDurumId) servisDurumEslestirilen += 1;
      if (guncellenecekKonumId) servisKonumEslestirilen += 1;
    }

    const personeller = await tx.personel.findMany({
      select: {
        id: true,
        unvan: true,
        unvanId: true,
      },
    });

    let personelUnvanEslestirilen = 0;
    for (const personel of personeller) {
      if (personel.unvanId) continue;

      const unvanAnahtari = anahtarNormalizeEt(String(personel.unvan));
      const guncellenecekUnvanId = unvanIdHaritasi.get(unvanAnahtari);
      if (!guncellenecekUnvanId) continue;

      await tx.personel.update({
        where: { id: personel.id },
        data: {
          unvanAyari: {
            connect: { id: guncellenecekUnvanId },
          },
        },
      });
      personelUnvanEslestirilen += 1;
    }

    const tumDurumAnahtarlari = new Set(
      (await tx.servisDurumuAyar.findMany({ select: { key: true } })).map((durum) =>
        anahtarNormalizeEt(durum.key)
      )
    );
    const tumKonumAnahtarlari = new Set(
      (await tx.konum.findMany({ select: { key: true } })).map((konum) => anahtarNormalizeEt(konum.key))
    );
    const tumUnvanAnahtarlari = new Set(
      (await tx.personelUnvanAyar.findMany({ select: { key: true } })).map((unvan) =>
        anahtarNormalizeEt(unvan.key)
      )
    );

    const eksikDurumAnahtarlari = VARSAYILAN_DURUMLAR.map((durum) => durum.key).filter(
      (anahtar) => !tumDurumAnahtarlari.has(anahtarNormalizeEt(anahtar))
    );
    const eksikKonumAnahtarlari = VARSAYILAN_KONUMLAR.map((konum) => konum.key).filter(
      (anahtar) => !tumKonumAnahtarlari.has(anahtarNormalizeEt(anahtar))
    );
    const eksikUnvanAnahtarlari = VARSAYILAN_UNVANLAR.map((unvan) => unvan.key).filter(
      (anahtar) => !tumUnvanAnahtarlari.has(anahtarNormalizeEt(anahtar))
    );

    return {
      durumUpsertSayisi: VARSAYILAN_DURUMLAR.length,
      konumUpsertSayisi: VARSAYILAN_KONUMLAR.length,
      unvanUpsertSayisi: VARSAYILAN_UNVANLAR.length,
      servisDurumEslestirilen,
      servisKonumEslestirilen,
      personelUnvanEslestirilen,
      eksikDurumAnahtarlari,
      eksikKonumAnahtarlari,
      eksikUnvanAnahtarlari,
    };
  }, { maxWait: 10000, timeout: 120000 });
}
