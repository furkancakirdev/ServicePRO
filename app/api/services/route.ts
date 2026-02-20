// Services API - CRUD Operations with Prisma
// ServicePro ERP - Marlin Yatçılık

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/api-auth';
import { PersonelRol, Prisma, ServisDurumu } from '@prisma/client';
import { getLokasyonGroupFromFields, normalizeServisDurumuForDb } from '@/lib/domain-mappers';
import { createUtcDayRange } from '@/lib/date-utils';
import { resolveBoatForService, toServisDurumu } from '@/lib/actions/service';

type AssignmentInput = {
  personelId: string;
  rol: PersonelRol;
};

type PartCategory = 'TASERON_BEKLEYEN' | 'SIPARIS_EDILEN_YEDEK';

type PartInput = {
  parcaAdi: string;
  miktar: number;
  kategori: PartCategory;
  tedarikci: string | null;
  beklenenTarih: Date | null;
  aciklama: string | null;
  tamamlandi: boolean;
};

const PART_CATEGORY_VALUES: PartCategory[] = ['TASERON_BEKLEYEN', 'SIPARIS_EDILEN_YEDEK'];

function normalizePartCategory(value: unknown): PartCategory {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
    .replaceAll(' ', '_');
  return PART_CATEGORY_VALUES.includes(normalized as PartCategory)
    ? (normalized as PartCategory)
    : 'SIPARIS_EDILEN_YEDEK';
}

function parsePartDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseParts(raw: unknown): PartInput[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) {
    throw new Error('Parca listesi gecersiz');
  }

  const normalized: PartInput[] = [];
  for (const item of raw) {
    const row = item as Record<string, unknown>;
    const parcaAdi = String(row.parcaAdi ?? '').trim();
    const tedarikci = String(row.tedarikci ?? '').trim();
    const aciklama = String(row.aciklama ?? row.not ?? '').trim();
    const miktarRaw = Number(row.miktar ?? 1);
    const miktar = Number.isFinite(miktarRaw) ? Math.max(1, Math.round(miktarRaw)) : 1;
    const kategori = normalizePartCategory(row.kategori ?? row.category ?? row.birim);
    const tamamlandi = Boolean(row.tamamlandi);
    const etaGunRaw = Number(row.etaGun);
    const beklenenTarihFromValue = parsePartDate(row.beklenenTarih);
    const beklenenTarih =
      beklenenTarihFromValue ??
      (Number.isFinite(etaGunRaw) && etaGunRaw > 0
        ? new Date(Date.now() + Math.round(etaGunRaw) * 24 * 60 * 60 * 1000)
        : null);

    if (!parcaAdi && !tedarikci && !aciklama && !beklenenTarih) {
      continue;
    }
    if (!parcaAdi) {
      throw new Error('Parca adi zorunludur');
    }

    normalized.push({
      parcaAdi,
      miktar,
      kategori,
      tedarikci: tedarikci || null,
      beklenenTarih,
      aciklama: aciklama || null,
      tamamlandi,
    });
  }

  return normalized;
}

function parseAssignments(raw: unknown): AssignmentInput[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) {
    throw new Error('Personel atama listesi gecersiz');
  }

  const normalized = raw.map((item) => {
    const personelId = String((item as { personelId?: string }).personelId ?? '').trim();
    const rawRole = String((item as { rol?: string }).rol ?? 'DESTEK').trim().toUpperCase();

    if (!personelId) {
      throw new Error('Personel atamasinda personelId zorunludur');
    }

    if (rawRole !== 'SORUMLU' && rawRole !== 'DESTEK') {
      throw new Error(`Gecersiz personel rolu: ${rawRole}`);
    }

    return {
      personelId,
      rol: rawRole as PersonelRol,
    };
  });

  if (new Set(normalized.map((item) => item.personelId)).size !== normalized.length) {
    throw new Error('Ayni personel birden fazla kez atanamaz');
  }

  return normalized;
}

/**
 * GET /api/services - Get all services with optional filtering
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const durum = searchParams.get('durum');
    const durumListRaw = [...searchParams.getAll('durum')];
    if (durum && durum.includes(',')) {
      durumListRaw.push(...durum.split(',').map((x) => x.trim()));
    } else if (durum) {
      durumListRaw.push(durum);
    }
    const tekneId = searchParams.get('tekneId');
    const arama = searchParams.get('arama');
    const date = searchParams.get('date');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const sort = searchParams.get('sort') || 'tarih';
    const order = (searchParams.get('order') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
    const adresGroup = searchParams.get('adresGroup');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ServiceWhereInput = {
      deletedAt: null,
    };

    if (durumListRaw.length > 0) {
      const durumList = durumListRaw
        .map((d) => normalizeServisDurumuForDb(d || '') as ServisDurumu)
        .filter((d): d is ServisDurumu => Object.values(ServisDurumu).includes(d));

      if (durumList.length > 0) {
        where.durum = { in: durumList };
      }
    }

    if (tekneId) {
      where.tekneId = tekneId;
    }

    if (arama) {
      where.OR = [
        { servisAciklamasi: { contains: arama, mode: 'insensitive' } },
        { tekneAdi: { contains: arama, mode: 'insensitive' } },
        { adres: { contains: arama, mode: 'insensitive' } },
      ];
    }

    if (date || dateFrom || dateTo) {
      const range: Prisma.DateTimeFilter = {};
      if (date) {
        const dayRange = createUtcDayRange(date);
        if (dayRange) {
          range.gte = dayRange.start;
          range.lte = dayRange.end;
        }
      } else {
        if (dateFrom) {
          const fromRange = createUtcDayRange(dateFrom);
          if (fromRange) range.gte = fromRange.start;
        }
        if (dateTo) {
          const toRange = createUtcDayRange(dateTo);
          if (toRange) range.lte = toRange.end;
        }
      }
      where.tarih = range;
    }

    if (adresGroup) {
      const group = adresGroup.toUpperCase();
      if (group === 'YATMARIN') {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : []),
          {
            OR: [
              { yer: { contains: 'yatmarin', mode: 'insensitive' } },
              { adres: { contains: 'yatmarin', mode: 'insensitive' } },
            ],
          },
        ];
      } else if (group === 'NETSEL') {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : []),
          {
            OR: [
              { yer: { contains: 'netsel', mode: 'insensitive' } },
              { adres: { contains: 'netsel', mode: 'insensitive' } },
            ],
          },
        ];
      } else if (group === 'DIS_SERVIS') {
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : []),
          {
            NOT: {
              OR: [
                { yer: { contains: 'yatmarin', mode: 'insensitive' } },
                { adres: { contains: 'yatmarin', mode: 'insensitive' } },
                { yer: { contains: 'netsel', mode: 'insensitive' } },
                { adres: { contains: 'netsel', mode: 'insensitive' } },
              ],
            },
          },
        ];
      }
    }

    const orderByMap: Record<string, Prisma.ServiceOrderByWithRelationInput> = {
      tarih: { tarih: order },
      tekneAdi: { tekneAdi: order },
      adres: { adres: order },
      yer: { yer: order },
      durum: { durum: order },
      createdAt: { createdAt: order },
      updatedAt: { updatedAt: order },
    };
    const primaryOrderBy = orderByMap[sort] ?? { tarih: 'desc' as const };

    // Get total count
    const total = await prisma.service.count({ where });

    // Get services with relations
    const services = await prisma.service.findMany({
      where,
      include: {
        tekne: true,
        ofisYetkili: {
          select: {
            id: true,
            ad: true,
            email: true,
            role: true,
          },
        },
        personeller: {
          include: {
            personel: true,
          },
        },
        bekleyenParcalar: true,
      },
      orderBy: [
        primaryOrderBy,
        { tarih: 'desc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: limit,
    });

    const normalizedServices = services.map((service) => ({
      ...service,
      yer: service.yer || getLokasyonGroupFromFields(service.yer, service.adres),
    }));

    return NextResponse.json({
      services: normalizedServices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/services error:', error);
    return NextResponse.json(
      { error: 'Servisler getirilemedi' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/services - Create new service
 */
export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const assignments = parseAssignments(body.personeller) ?? [];
    const waitingParts = parseParts(body.bekleyenParcalar) ?? [];

    const resolvedBoat = await resolveBoatForService(prisma, {
      tekneId: body.tekneId,
      tekneAdi: body.tekneAdi,
      boatName: body.boatName,
    });

    if (assignments.length > 0) {
      const personnel = await prisma.personel.findMany({
        where: {
          id: { in: assignments.map((item) => item.personelId) },
          deletedAt: null,
          aktif: true,
        },
        select: { id: true },
      });

      if (personnel.length !== assignments.length) {
        const validSet = new Set(personnel.map((item) => item.id));
        const invalid = assignments.map((item) => item.personelId).filter((id) => !validSet.has(id));
        return NextResponse.json(
          { error: `Gecersiz veya pasif personel secimi: ${invalid.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Create service
    const service = await prisma.service.create({
      data: {
        tarih: body.tarih ? new Date(body.tarih) : null,
        tahminiBitisTarihi: body.tahminiBitisTarihi ? new Date(body.tahminiBitisTarihi) : null,
        saat: body.saat,
        isTuru: body.isTuru || 'PAKET',
        tekneId: resolvedBoat.tekneId,
        tekneAdi: resolvedBoat.tekneAdi,
        adres: body.adres,
        yer: body.yer,
        servisAciklamasi: body.servisAciklamasi,
        irtibatKisi: body.irtibatKisi,
        telefon: body.telefon,
        durum: toServisDurumu(body.durum, 'RANDEVU_VERILDI'),
        ofisYetkiliId: body.ofisYetkiliId,
        taseronNotlari: body.taseronNotlari,
        ...(assignments.length > 0 && {
          personeller: {
            create: assignments.map((assignment) => ({
              personelId: assignment.personelId,
              rol: assignment.rol,
            })),
          },
        }),
        ...(waitingParts.length > 0 && {
          bekleyenParcalar: {
            create: waitingParts.map((part) => ({
              parcaAdi: part.parcaAdi,
              miktar: part.miktar,
              birim: part.kategori,
              tedarikci: part.tedarikci,
              beklenenTarih: part.beklenenTarih,
              aciklama: part.aciklama,
              tamamlandi: part.tamamlandi,
            })),
          },
        }),
      },
      include: {
        tekne: true,
        ofisYetkili: {
          select: {
            id: true,
            ad: true,
            email: true,
          },
        },
        personeller: {
          include: {
            personel: {
              select: {
                id: true,
                ad: true,
                unvan: true,
              },
            },
          },
        },
        bekleyenParcalar: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: 'CREATE',
        entityTipi: 'Service',
        entityId: service.id,
        detay: `Yeni servis oluşturuldu: ${service.tekneAdi}`,
      },
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    if (error instanceof Error && /(personel|parca)/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('POST /api/services error:', error);
    return NextResponse.json(
      { error: 'Servis oluşturulamadı' },
      { status: 500 }
    );
  }
}
