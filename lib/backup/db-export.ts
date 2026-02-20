import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  guvenliJsonNesnesi,
  type JsonNesne,
  type VeritabaniYedekSonucu,
} from './types';

type PrismaDelegate = {
  findMany: (args?: Record<string, unknown>) => Promise<unknown[]>;
};

function modelDelegateAdi(modelAdi: string): string {
  const ilkHarf = modelAdi.charAt(0).toLowerCase();
  const geriKalan = modelAdi.slice(1);
  return `${ilkHarf}${geriKalan}`;
}

function prismaDelegateMi(aday: unknown): aday is PrismaDelegate {
  if (typeof aday !== 'object' || aday === null) return false;
  if (!('findMany' in aday)) return false;
  const delegate = aday as { findMany?: unknown };
  return typeof delegate.findMany === 'function';
}

function kayitlariJsonaCevir(kayitlar: unknown[]): JsonNesne[] {
  return kayitlar.map((kayit) => guvenliJsonNesnesi(kayit));
}

export async function veritabaniVerisiniDisaAktar(): Promise<VeritabaniYedekSonucu> {
  const modelAdlari = Prisma.dmmf.datamodel.models.map((model) => model.name);
  const veriler: Record<string, JsonNesne[]> = {};
  let toplamKayit = 0;

  for (const modelAdi of modelAdlari) {
    const delegateAdi = modelDelegateAdi(modelAdi);
    const delegateAday = (prisma as unknown as Record<string, unknown>)[delegateAdi];

    if (!prismaDelegateMi(delegateAday)) {
      continue;
    }

    const hamKayitlar = await delegateAday.findMany();
    const kayitlar = kayitlariJsonaCevir(hamKayitlar);
    veriler[modelAdi] = kayitlar;
    toplamKayit += kayitlar.length;
  }

  return {
    tablolar: Object.keys(veriler),
    toplamKayit,
    veriler,
  };
}
