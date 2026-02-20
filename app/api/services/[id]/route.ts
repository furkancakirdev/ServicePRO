import { NextResponse } from 'next/server';
import { PersonelRol, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/api-auth';
import { resolveBoatForService, toServisDurumu } from '@/lib/actions/service';

type RouteContext = {
  params: {
    id: string;
  };
};

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

async function ensureValidPersonnel(
  tx: Prisma.TransactionClient,
  assignments: AssignmentInput[]
): Promise<void> {
  if (assignments.length === 0) return;

  const ids = assignments.map((item) => item.personelId);
  const personnel = await tx.personel.findMany({
    where: {
      id: { in: ids },
      deletedAt: null,
      aktif: true,
    },
    select: { id: true },
  });

  if (personnel.length !== ids.length) {
    const validSet = new Set(personnel.map((item) => item.id));
    const missing = ids.filter((id) => !validSet.has(id));
    throw new Error(`Gecersiz veya pasif personel secimi: ${missing.join(', ')}`);
  }
}

async function syncServiceAssignments(
  tx: Prisma.TransactionClient,
  serviceId: string,
  assignments: AssignmentInput[] | undefined
): Promise<void> {
  if (assignments === undefined) return;

  await ensureValidPersonnel(tx, assignments);

  if (assignments.length === 0) {
    await tx.servicePersonel.deleteMany({ where: { servisId: serviceId } });
    return;
  }

  const assignmentIds = assignments.map((item) => item.personelId);

  await tx.servicePersonel.deleteMany({
    where: {
      servisId: serviceId,
      personelId: { notIn: assignmentIds },
    },
  });

  for (const assignment of assignments) {
    await tx.servicePersonel.upsert({
      where: {
        servisId_personelId: {
          servisId: serviceId,
          personelId: assignment.personelId,
        },
      },
      create: {
        servisId: serviceId,
        personelId: assignment.personelId,
        rol: assignment.rol,
      },
      update: {
        rol: assignment.rol,
      },
    });
  }
}

async function syncWaitingParts(
  tx: Prisma.TransactionClient,
  serviceId: string,
  parts: PartInput[] | undefined
): Promise<void> {
  if (parts === undefined) return;

  await tx.parcaBekleme.deleteMany({ where: { servisId: serviceId } });
  if (parts.length === 0) return;

  await tx.parcaBekleme.createMany({
    data: parts.map((part) => ({
      servisId: serviceId,
      parcaAdi: part.parcaAdi,
      miktar: part.miktar,
      birim: part.kategori,
      tedarikci: part.tedarikci,
      beklenenTarih: part.beklenenTarih,
      aciklama: part.aciklama,
      tamamlandi: part.tamamlandi,
    })),
  });
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const service = await prisma.service.findFirst({
      where: { id: params.id, deletedAt: null },
      include: {
        tekne: {
          select: {
            id: true,
            ad: true,
          },
        },
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
            personel: {
              select: {
                id: true,
                ad: true,
                unvan: true,
              },
            },
          },
          orderBy: [{ rol: 'desc' }],
        },
        bekleyenParcalar: true,
      },
    });

    if (!service) {
      return NextResponse.json({ error: 'Servis bulunamadi' }, { status: 404 });
    }

    return NextResponse.json(service);
  } catch (error) {
    console.error('GET /api/services/[id] error:', error);
    return NextResponse.json({ error: 'Servis getirilemedi' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const requestedAssignments = parseAssignments(body.personeller);
    const requestedParts = parseParts(body.bekleyenParcalar);

    const existing = await prisma.service.findFirst({
      where: { id: params.id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Servis bulunamadi' }, { status: 404 });
    }

    const requestedDurum = body.durum !== undefined ? toServisDurumu(body.durum, existing.durum) : undefined;
    if (requestedDurum === 'TAMAMLANDI' && existing.durum !== 'TAMAMLANDI') {
      return NextResponse.json(
        { error: 'Servisi tamamlamak icin puanlama adimini kullanin.' },
        { status: 409 }
      );
    }

    const shouldUpdateBoat =
      body.tekneId !== undefined || body.tekneAdi !== undefined || body.boatName !== undefined;

    const resolvedBoat = shouldUpdateBoat
      ? await resolveBoatForService(prisma, {
          tekneId: body.tekneId,
          tekneAdi: body.tekneAdi,
          boatName: body.boatName,
        })
      : null;

    const service = await prisma.$transaction(async (tx) => {
      await syncServiceAssignments(tx, params.id, requestedAssignments);
      await syncWaitingParts(tx, params.id, requestedParts);

      return tx.service.update({
        where: { id: params.id },
        data: {
          ...(resolvedBoat && {
            tekneId: resolvedBoat.tekneId,
            tekneAdi: resolvedBoat.tekneAdi,
          }),
          ...(body.tarih !== undefined && { tarih: body.tarih ? new Date(body.tarih) : null }),
          ...(body.tahminiBitisTarihi !== undefined && {
            tahminiBitisTarihi: body.tahminiBitisTarihi ? new Date(body.tahminiBitisTarihi) : null,
          }),
          ...(body.saat !== undefined && { saat: body.saat }),
          ...(body.isTuru !== undefined && { isTuru: body.isTuru }),
          ...(body.adres !== undefined && { adres: body.adres }),
          ...(body.yer !== undefined && { yer: body.yer }),
          ...(body.servisAciklamasi !== undefined && { servisAciklamasi: body.servisAciklamasi }),
          ...(body.irtibatKisi !== undefined && { irtibatKisi: body.irtibatKisi }),
          ...(body.telefon !== undefined && { telefon: body.telefon }),
          ...(requestedDurum !== undefined && { durum: requestedDurum }),
          ...(body.taseronNotlari !== undefined && { taseronNotlari: body.taseronNotlari }),
          ...(body.tamamlanmaAt !== undefined && {
            tamamlanmaAt: body.tamamlanmaAt ? new Date(body.tamamlanmaAt) : null,
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
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: 'UPDATE',
        entityTipi: 'Service',
        entityId: service.id,
        detay: `Servis guncellendi: ${service.tekneAdi}`,
      },
    });

    return NextResponse.json(service);
  } catch (error) {
    if (error instanceof Error && /(personel|parca)/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('PUT /api/services/[id] error:', error);
    return NextResponse.json({ error: 'Servis guncellenemedi' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const requestedAssignments = parseAssignments(body.personeller);
    const requestedParts = parseParts(body.bekleyenParcalar);

    const existing = await prisma.service.findFirst({
      where: { id: params.id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Servis bulunamadi' }, { status: 404 });
    }

    const requestedDurum = body.durum !== undefined ? toServisDurumu(body.durum, existing.durum) : undefined;
    if (requestedDurum === 'TAMAMLANDI' && existing.durum !== 'TAMAMLANDI') {
      return NextResponse.json(
        { error: 'Servisi tamamlamak icin puanlama adimini kullanin.' },
        { status: 409 }
      );
    }

    const shouldUpdateBoat =
      body.tekneId !== undefined || body.tekneAdi !== undefined || body.boatName !== undefined;

    const resolvedBoat = shouldUpdateBoat
      ? await resolveBoatForService(prisma, {
          tekneId: body.tekneId,
          tekneAdi: body.tekneAdi,
          boatName: body.boatName,
        })
      : null;

    const service = await prisma.$transaction(async (tx) => {
      await syncServiceAssignments(tx, params.id, requestedAssignments);
      await syncWaitingParts(tx, params.id, requestedParts);

      return tx.service.update({
        where: { id: params.id },
        data: {
          ...(resolvedBoat && {
            tekneId: resolvedBoat.tekneId,
            tekneAdi: resolvedBoat.tekneAdi,
          }),
          ...(body.tarih !== undefined && { tarih: body.tarih ? new Date(body.tarih) : null }),
          ...(body.tahminiBitisTarihi !== undefined && {
            tahminiBitisTarihi: body.tahminiBitisTarihi ? new Date(body.tahminiBitisTarihi) : null,
          }),
          ...(body.saat !== undefined && { saat: body.saat }),
          ...(body.isTuru !== undefined && { isTuru: body.isTuru }),
          ...(body.adres !== undefined && { adres: body.adres }),
          ...(body.yer !== undefined && { yer: body.yer }),
          ...(body.servisAciklamasi !== undefined && { servisAciklamasi: body.servisAciklamasi }),
          ...(body.irtibatKisi !== undefined && { irtibatKisi: body.irtibatKisi }),
          ...(body.telefon !== undefined && { telefon: body.telefon }),
          ...(requestedDurum !== undefined && { durum: requestedDurum }),
          ...(body.taseronNotlari !== undefined && { taseronNotlari: body.taseronNotlari }),
          ...(body.tamamlanmaAt !== undefined && {
            tamamlanmaAt: body.tamamlanmaAt ? new Date(body.tamamlanmaAt) : null,
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
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: 'UPDATE',
        entityTipi: 'Service',
        entityId: service.id,
        detay: `Servis kismi guncellendi: ${service.tekneAdi}`,
      },
    });

    return NextResponse.json(service);
  } catch (error) {
    if (error instanceof Error && /(personel|parca)/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('PATCH /api/services/[id] error:', error);
    return NextResponse.json({ error: 'Servis guncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN']);
    if (!auth.ok) return auth.response;

    const deleted = await prisma.service.updateMany({
      where: { id: params.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Servis bulunamadi' }, { status: 404 });
    }

    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: 'DELETE',
        entityTipi: 'Service',
        entityId: params.id,
        detay: `Servis silindi: ${params.id}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/services/[id] error:', error);
    return NextResponse.json({ error: 'Servis silinemedi' }, { status: 500 });
  }
}
