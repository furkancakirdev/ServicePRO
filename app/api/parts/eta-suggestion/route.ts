import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/api-auth';
import { readSettings } from '@/lib/settings/settings-store';

type PartCategory = 'TASERON_BEKLEYEN' | 'SIPARIS_EDILEN_YEDEK';
export const dynamic = 'force-dynamic';

const PART_CATEGORY_VALUES: PartCategory[] = ['TASERON_BEKLEYEN', 'SIPARIS_EDILEN_YEDEK'];

function normalizeCategory(value: string | null): PartCategory {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
    .replaceAll(' ', '_');
  return PART_CATEGORY_VALUES.includes(normalized as PartCategory)
    ? (normalized as PartCategory)
    : 'SIPARIS_EDILEN_YEDEK';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const settings = readSettings();
    const { searchParams } = new URL(request.url);
    const supplier = String(searchParams.get('supplier') ?? '').trim();
    const partName = String(searchParams.get('partName') ?? '').trim();
    const category = normalizeCategory(searchParams.get('category'));

    const fallbackDays =
      category === 'TASERON_BEKLEYEN'
        ? settings.partsEta.defaultWaitingEtaDays
        : settings.partsEta.defaultOrderedEtaDays;

    if (!settings.partsEta.enabled) {
      return NextResponse.json({
        etaDays: fallbackDays,
        sampleSize: 0,
        source: 'disabled',
        category,
        estimatedArrivalDate: new Date(
          Date.now() + fallbackDays * 24 * 60 * 60 * 1000
        ).toISOString(),
      });
    }

    const lookbackStart = new Date(Date.now() - settings.partsEta.historyLookbackDays * 24 * 60 * 60 * 1000);
    const history = await prisma.parcaBekleme.findMany({
      where: {
        createdAt: {
          gte: lookbackStart,
        },
        beklenenTarih: {
          not: null,
        },
        ...(supplier && {
          tedarikci: {
            contains: supplier,
            mode: 'insensitive',
          },
        }),
        ...(partName && {
          parcaAdi: {
            contains: partName,
            mode: 'insensitive',
          },
        }),
        birim: category,
      },
      select: {
        createdAt: true,
        beklenenTarih: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 250,
    });

    const leadTimes = history
      .map((item) => {
        if (!item.beklenenTarih) return null;
        const diffMs = item.beklenenTarih.getTime() - item.createdAt.getTime();
        const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
        if (!Number.isFinite(diffDays)) return null;
        return clamp(diffDays, 1, settings.partsEta.maxEtaDays);
      })
      .filter((value): value is number => value !== null);

    const hasEnoughData = leadTimes.length >= settings.partsEta.minHistoryRecords;
    const etaDays = hasEnoughData
      ? clamp(Math.round(median(leadTimes)), 1, settings.partsEta.maxEtaDays)
      : fallbackDays;

    return NextResponse.json({
      etaDays,
      sampleSize: leadTimes.length,
      source: hasEnoughData ? 'history' : 'default',
      category,
      estimatedArrivalDate: new Date(Date.now() + etaDays * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('GET /api/parts/eta-suggestion error:', error);
    return NextResponse.json({ error: 'ETA tahmini alinmadi' }, { status: 500 });
  }
}
