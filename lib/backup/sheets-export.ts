import { prisma } from '@/lib/prisma';
import { guvenliJsonNesnesi, type SheetsYedekSonucu } from './types';

export async function sheetsVerisiniDisaAktar(): Promise<SheetsYedekSonucu> {
  const syncLogKayitlari = await prisma.syncLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  const conflictLoglari = syncLogKayitlari
    .filter((kayit) => (kayit.errors ?? '').trim().length > 0)
    .map((kayit) => ({
      id: kayit.id,
      status: kayit.status,
      errors: kayit.errors ?? '',
      createdAt: kayit.createdAt.toISOString(),
    }));

  return {
    syncLog: syncLogKayitlari.map((kayit) => guvenliJsonNesnesi(kayit)),
    conflictLoglari,
  };
}
