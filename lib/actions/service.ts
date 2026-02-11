import { PrismaClient, ServisDurumu } from '@prisma/client';
import { normalizeServisDurumuForDb } from '@/lib/domain-mappers';

export interface ServiceBoatInput {
  tekneId?: string | null;
  tekneAdi?: string | null;
  boatName?: string | null;
}

function normalizeBoatName(input: string | null | undefined): string {
  return String(input ?? '').trim();
}

function isServisDurumu(value: string): value is ServisDurumu {
  return Object.values(ServisDurumu).includes(value as ServisDurumu);
}

export function toServisDurumu(
  value: unknown,
  fallback: ServisDurumu = 'RANDEVU_VERILDI'
): ServisDurumu {
  const normalized = normalizeServisDurumuForDb(String(value ?? '')).trim();
  return isServisDurumu(normalized) ? normalized : fallback;
}

export async function resolveBoatForService(
  prisma: PrismaClient,
  input: ServiceBoatInput
): Promise<{ tekneId: string; tekneAdi: string }> {
  const requestedBoatName = normalizeBoatName(input.boatName ?? input.tekneAdi);

  if (input.tekneId) {
    const tekne = await prisma.tekne.findUnique({
      where: { id: input.tekneId },
      select: { id: true, ad: true, deletedAt: true },
    });

    if (!tekne || tekne.deletedAt) {
      throw new Error('Secilen tekne bulunamadi');
    }

    return {
      tekneId: tekne.id,
      tekneAdi: requestedBoatName || tekne.ad,
    };
  }

  if (!requestedBoatName) {
    throw new Error('Tekne adi zorunludur');
  }

  const existing = await prisma.tekne.findFirst({
    where: {
      deletedAt: null,
      ad: {
        equals: requestedBoatName,
        mode: 'insensitive',
      },
    },
    select: { id: true, ad: true },
  });

  if (existing) {
    return {
      tekneId: existing.id,
      tekneAdi: requestedBoatName,
    };
  }

  const created = await prisma.tekne.create({
    data: {
      ad: requestedBoatName,
      aktif: true,
    },
    select: { id: true, ad: true },
  });

  return {
    tekneId: created.id,
    tekneAdi: requestedBoatName,
  };
}

