import { LeadStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import { JOB_AUDIT_EVENTS, writeAuditEvent } from '@/lib/audit/events';
import { parseDateTimeInputInTimeZone, TR_TIME_ZONE } from '@/lib/timezone';
import { prisma } from '@/lib/prisma';

const leadStatusValues = ['YENI', 'TAKIPTE', 'TEKLIF_BEKLIYOR', 'KAYBEDILDI', 'KAZANILDI'] as const;

const leadCreateSchema = z.object({
  kaynak: z.string().trim().max(64).optional().nullable(),
  ad: z.string().trim().max(128).optional().nullable(),
  telefon: z.string().trim().max(32).optional().nullable(),
  email: z.string().trim().max(320).optional().nullable(),
  konu: z.string().trim().max(255).optional().nullable(),
  notlar: z.string().trim().max(4000).optional().nullable(),
  status: z.enum(leadStatusValues).optional(),
  takipAt: z.string().trim().min(1).optional().nullable(),
  tekneId: z.string().trim().min(1).optional().nullable(),
  ownerUserId: z.string().trim().min(1).optional().nullable(),
});

function toNullableText(value: string | null | undefined): string | null {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function parseTakipAt(value: string | null | undefined): Date | null {
  if (!value) return null;
  return parseDateTimeInputInTimeZone(value, TR_TIME_ZONE);
}

function parseStatus(raw: string | null): LeadStatus | null {
  if (!raw) return null;
  return leadStatusValues.includes(raw as LeadStatus) ? (raw as LeadStatus) : null;
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() ?? '';
    const status = parseStatus(searchParams.get('status'));
    const ownerUserId = searchParams.get('owner')?.trim() ?? '';
    const dueBefore = searchParams.get('dueBefore')?.trim() ?? '';
    const dueBeforeDate = dueBefore ? parseDateTimeInputInTimeZone(dueBefore, TR_TIME_ZONE) : null;

    const leads = await prisma.lead.findMany({
      where: {
        status: status ?? undefined,
        ownerUserId: ownerUserId || undefined,
        takipAt: dueBeforeDate
          ? {
              lte: dueBeforeDate,
            }
          : undefined,
        OR: q
          ? [
              { ad: { contains: q, mode: 'insensitive' } },
              { telefon: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { konu: { contains: q, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: {
        tekne: {
          select: {
            id: true,
            ad: true,
          },
        },
        ownerUser: {
          select: {
            id: true,
            ad: true,
            email: true,
          },
        },
      },
      orderBy: [
        {
          takipAt: 'asc',
        },
        {
          createdAt: 'desc',
        },
      ],
      take: 500,
    });

    const now = Date.now();

    return NextResponse.json({
      leads: leads.map((lead) => ({
        ...lead,
        takipAt: lead.takipAt ? lead.takipAt.toISOString() : null,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
        overdue:
          Boolean(lead.takipAt) &&
          (lead.status === 'YENI' || lead.status === 'TAKIPTE' || lead.status === 'TEKLIF_BEKLIYOR') &&
          (lead.takipAt?.getTime() ?? 0) < now,
      })),
    });
  } catch (error) {
    console.error('GET /api/leads error:', error);
    return NextResponse.json({ error: 'Lead listesi getirilemedi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const parsed = leadCreateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz lead istegi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const takipAt = parseTakipAt(payload.takipAt);
    if (payload.takipAt && !takipAt) {
      return NextResponse.json(
        { error: 'Takip tarihi gecersiz. Beklenen format: YYYY-MM-DDTHH:mm' },
        { status: 400 }
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      if (payload.tekneId) {
        const tekne = await tx.tekne.findFirst({
          where: {
            id: payload.tekneId,
            deletedAt: null,
          },
          select: { id: true },
        });

        if (!tekne) {
          return { kind: 'INVALID_TEKNE' as const };
        }
      }

      const ownerUserId = payload.ownerUserId ?? auth.payload.userId;
      if (ownerUserId) {
        const owner = await tx.user.findUnique({
          where: { id: ownerUserId },
          select: { id: true },
        });
        if (!owner) {
          return { kind: 'INVALID_OWNER' as const };
        }
      }

      const lead = await tx.lead.create({
        data: {
          organizationId: 'org_default',
          kaynak: toNullableText(payload.kaynak),
          ad: toNullableText(payload.ad),
          telefon: toNullableText(payload.telefon),
          email: toNullableText(payload.email),
          konu: toNullableText(payload.konu),
          notlar: toNullableText(payload.notlar),
          takipAt,
          tekneId: payload.tekneId ?? null,
          ownerUserId,
          status: (payload.status ?? 'YENI') as LeadStatus,
        },
      });

      await writeAuditEvent(tx, {
        organizationId: 'org_default',
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.LEAD_CREATED,
        entityTipi: 'Lead',
        entityId: lead.id,
        detay: `Lead olusturuldu: ${lead.telefon ?? '-'} / ${lead.konu ?? '-'}`,
      });

      return {
        kind: 'OK' as const,
        lead,
      };
    });

    if (created.kind === 'INVALID_TEKNE') {
      return NextResponse.json({ error: 'Secilen tekne bulunamadi' }, { status: 400 });
    }
    if (created.kind === 'INVALID_OWNER') {
      return NextResponse.json({ error: 'Secilen owner kullanici bulunamadi' }, { status: 400 });
    }

    return NextResponse.json(
      {
        ...created.lead,
        takipAt: created.lead.takipAt ? created.lead.takipAt.toISOString() : null,
        createdAt: created.lead.createdAt.toISOString(),
        updatedAt: created.lead.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/leads error:', error);
    return NextResponse.json({ error: 'Lead olusturulamadi' }, { status: 500 });
  }
}
