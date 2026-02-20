import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { yedekDosyasiOku, yedekOlustur, yedekleriListele } from './index';
import type { JsonNesne, YedekIcerigi } from './types';

type PrismaCreateManyDelegate = {
  createMany: (args: { data: Record<string, unknown>[] }) => Promise<{ count: number }>;
};

type ModelAlani = Prisma.DMMF.Field;
type ModelTanimi = Prisma.DMMF.Model;

interface RestoreSecenekleri {
  dosyaAdi?: string;
}

export interface RestoreSonucu {
  kaynakDosya: string;
  geriYuklemeYedegiId: string;
  restoreEdilenTablolar: string[];
  restoreEdilenKayitSayisi: number;
  tabloBazliKayitSayilari: Record<string, number>;
  tamamlanmaZamani: string;
}

function modelDelegateAdi(modelAdi: string): string {
  return `${modelAdi.charAt(0).toLowerCase()}${modelAdi.slice(1)}`;
}

function createManyDelegateMi(aday: unknown): aday is PrismaCreateManyDelegate {
  if (typeof aday !== 'object' || aday === null) return false;
  if (!('createMany' in aday)) return false;
  const delegate = aday as { createMany?: unknown };
  return typeof delegate.createMany === 'function';
}

function modelSqlTabloAdi(model: ModelTanimi): string {
  return model.dbName ?? model.name;
}

function sqlKimligiKacisli(deger: string): string {
  return `"${deger.replaceAll('"', '""')}"`;
}

function modelScalarAlanlariGetir(model: ModelTanimi): ModelAlani[] {
  return model.fields.filter((alan) => alan.kind !== 'object');
}

function alanDegeriniDonustur(alan: ModelAlani, deger: unknown): unknown {
  if (deger === undefined) return undefined;
  if (deger === null) return null;

  switch (alan.type) {
    case 'DateTime': {
      const tarih = new Date(String(deger));
      return Number.isNaN(tarih.getTime()) ? null : tarih;
    }
    case 'Int': {
      const sayi = Number(deger);
      return Number.isFinite(sayi) ? Math.trunc(sayi) : null;
    }
    case 'Float': {
      const sayi = Number(deger);
      return Number.isFinite(sayi) ? sayi : null;
    }
    case 'Boolean':
      return Boolean(deger);
    case 'BigInt':
      return BigInt(String(deger));
    case 'Decimal':
      return new Prisma.Decimal(deger as Prisma.Decimal.Value);
    case 'Bytes':
      return Buffer.from(String(deger), 'base64');
    default:
      return deger;
  }
}

function yedekKaydiniCreateInputaDonustur(
  model: ModelTanimi,
  kayit: JsonNesne
): Record<string, unknown> {
  const scalarAlanlar = modelScalarAlanlariGetir(model);
  const sonuc: Record<string, unknown> = {};

  for (const alan of scalarAlanlar) {
    if (!(alan.name in kayit)) continue;
    sonuc[alan.name] = alanDegeriniDonustur(alan, kayit[alan.name]);
  }

  return sonuc;
}

function modelBagimliliklariniGetir(model: ModelTanimi): string[] {
  const bagimliliklar = new Set<string>();

  for (const alan of model.fields) {
    if (alan.kind !== 'object') continue;
    if (!alan.relationFromFields || alan.relationFromFields.length === 0) continue;
    if (typeof alan.type === 'string' && alan.type !== model.name) {
      bagimliliklar.add(alan.type);
    }
  }

  return Array.from(bagimliliklar);
}

function restoreSirasiHesapla(models: readonly ModelTanimi[]): ModelTanimi[] {
  const modelMap = new Map<string, ModelTanimi>(models.map((model) => [model.name, model]));
  const ziyaretDurumu = new Map<string, 'yok' | 'geziyor' | 'tamam'>(
    models.map((model) => [model.name, 'yok'])
  );
  const siraliModelAdlari: string[] = [];

  const ziyaretEt = (modelAdi: string): void => {
    const durum = ziyaretDurumu.get(modelAdi);
    if (durum === 'tamam') return;
    if (durum === 'geziyor') return;

    ziyaretDurumu.set(modelAdi, 'geziyor');
    const model = modelMap.get(modelAdi);
    if (model) {
      const bagimliliklar = modelBagimliliklariniGetir(model);
      for (const bagimlilik of bagimliliklar) {
        ziyaretEt(bagimlilik);
      }
    }
    ziyaretDurumu.set(modelAdi, 'tamam');
    siraliModelAdlari.push(modelAdi);
  };

  for (const model of models) {
    ziyaretEt(model.name);
  }

  const benzersizSira = Array.from(new Set(siraliModelAdlari));
  return benzersizSira.map((modelAdi) => modelMap.get(modelAdi)).filter(Boolean) as ModelTanimi[];
}

function parcalaraBol<T>(liste: T[], parcaBoyutu = 500): T[][] {
  const parcalar: T[][] = [];
  for (let i = 0; i < liste.length; i += parcaBoyutu) {
    parcalar.push(liste.slice(i, i + parcaBoyutu));
  }
  return parcalar;
}

async function restoreKaynakYedegiGetir(
  secenekler: RestoreSecenekleri
): Promise<{ dosyaAdi: string; icerik: YedekIcerigi }> {
  if (secenekler.dosyaAdi) {
    const icerik = await yedekDosyasiOku(secenekler.dosyaAdi);
    return { dosyaAdi: secenekler.dosyaAdi, icerik };
  }

  const sonYedek = (await yedekleriListele(1))[0];
  if (!sonYedek) {
    throw new Error('Restore icin uygun yedek dosyasi bulunamadi');
  }

  const icerik = await yedekDosyasiOku(sonYedek.dosyaAdi);
  return { dosyaAdi: sonYedek.dosyaAdi, icerik };
}

export async function yedektenGeriYukle(
  secenekler: RestoreSecenekleri = {}
): Promise<RestoreSonucu> {
  const kaynak = await restoreKaynakYedegiGetir(secenekler);

  // Geri yukleme oncesi emniyet yedegi
  const geriYuklemeOncesiYedek = await yedekOlustur({ tur: 'manuel' });

  const models = Prisma.dmmf.datamodel.models;
  const restoreSirasi = restoreSirasiHesapla(models);
  const tabloAdlari = models.map((model) => modelSqlTabloAdi(model));

  const tabloBazliKayitSayilari: Record<string, number> = {};

  await prisma.$transaction(async (tx) => {
    const truncateSql = `TRUNCATE TABLE ${tabloAdlari
      .map((tabloAdi) => `"public".${sqlKimligiKacisli(tabloAdi)}`)
      .join(', ')} RESTART IDENTITY CASCADE`;
    await tx.$executeRawUnsafe(truncateSql);

    for (const model of restoreSirasi) {
      const kayitlar = kaynak.icerik.data[model.name];
      if (!kayitlar || kayitlar.length === 0) {
        tabloBazliKayitSayilari[model.name] = 0;
        continue;
      }

      const delegateAdi = modelDelegateAdi(model.name);
      const delegateAday = (tx as unknown as Record<string, unknown>)[delegateAdi];
      if (!createManyDelegateMi(delegateAday)) {
        tabloBazliKayitSayilari[model.name] = 0;
        continue;
      }

      let eklenenKayit = 0;
      const createInputlari = kayitlar.map((kayit) =>
        yedekKaydiniCreateInputaDonustur(model, kayit)
      );

      for (const parca of parcalaraBol(createInputlari, 500)) {
        if (parca.length === 0) continue;
        const sonuc = await delegateAday.createMany({ data: parca });
        eklenenKayit += sonuc.count;
      }

      tabloBazliKayitSayilari[model.name] = eklenenKayit;
    }
  }, { maxWait: 10000, timeout: 180000 });

  const restoreEdilenTablolar = Object.keys(tabloBazliKayitSayilari);
  const restoreEdilenKayitSayisi = Object.values(tabloBazliKayitSayilari).reduce(
    (toplam, adet) => toplam + adet,
    0
  );

  return {
    kaynakDosya: kaynak.dosyaAdi,
    geriYuklemeYedegiId: geriYuklemeOncesiYedek.id,
    restoreEdilenTablolar,
    restoreEdilenKayitSayisi,
    tabloBazliKayitSayilari,
    tamamlanmaZamani: new Date().toISOString(),
  };
}
