import { LeadStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import { JOB_AUDIT_EVENTS, writeAuditEvent } from '@/lib/audit/events';
import { parseDateTimeInputInTimeZone, TR_TIME_ZONE } from '@/lib/timezone';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: {
    id: string;
  };
};

const leadStatusValues = ['YENI', 'TAKIPTE', 'TEKLIF_BEKLIYOR', 'KAYBEDILDI', 'KAZANILDI'] as const;

const leadUpdateSchema = z.object({
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

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
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
        bookings: {
          select: {
            id: true,
            status: true,
            servisId: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 30,
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead bulunamadi' }, { status: 404 });
    }

    return NextResponse.json({
      ...lead,
      takipAt: lead.takipAt ? lead.takipAt.toISOString() : null,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
      bookings: lead.bookings.map((booking) => ({
        ...booking,
        createdAt: booking.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('GET /api/leads/[id] error:', error);
    return NextResponse.json({ error: 'Lead detayi getirilemedi' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const parsed = leadUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz lead guncelleme istegi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const takipAt = payload.takipAt !== undefined ? parseTakipAt(payload.takipAt) : undefined;
    if (payload.takipAt !== undefined && payload.takipAt !== null && !takipAt) {
      return NextResponse.json(
        { error: 'Takip tarihi gecersiz. Beklenen format: YYYY-MM-DDTHH:mm' },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.lead.findUnique({
        where: { id: params.id },
        select: {
          id: true,
        },
      });

      if (!existing) {
        return { kind: 'NOT_FOUND' as const };
      }

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

      if (payload.ownerUserId) {
        const owner = await tx.user.findUnique({
          where: { id: payload.ownerUserId },
          select: { id: true },
        });
        if (!owner) {
          return { kind: 'INVALID_OWNER' as const };
        }
      }

      const lead = await tx.lead.update({
        where: { id: params.id },
        data: {
          ...(payload.kaynak !== undefined && { kaynak: toNullableText(payload.kaynak) }),
          ...(payload.ad !== undefined && { ad: toNullableText(payload.ad) }),
          ...(payload.telefon !== undefined && { telefon: toNullableText(payload.telefon) }),
          ...(payload.email !== undefined && { email: toNullableText(payload.email) }),
          ...(payload.konu !== undefined && { konu: toNullableText(payload.konu) }),
          ...(payload.notlar !== undefined && { notlar: toNullableText(payload.notlar) }),
          ...(payload.status !== undefined && { status: payload.status as LeadStatus }),
          ...(payload.takipAt !== undefined && { takipAt }),
          ...(payload.tekneId !== undefined && { tekneId: payload.tekneId }),
          ...(payload.ownerUserId !== undefined && { ownerUserId: payload.ownerUserId }),
        },
      });

      await writeAuditEvent(tx, {
        organizationId: lead.organizationId,
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.LEAD_UPDATED,
        entityTipi: 'Lead',
        entityId: lead.id,
        detay: `Lead guncellendi. status=${lead.status}`,
      });

      return {
        kind: 'OK' as const,
        lead,
      };
    });

    if (updated.kind === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Lead bulunamadi' }, { status: 404 });
    }
    if (updated.kind === 'INVALID_TEKNE') {
      return NextResponse.json({ error: 'Secilen tekne bulunamadi' }, { status: 400 });
    }
    if (updated.kind === 'INVALID_OWNER') {
      return NextResponse.json({ error: 'Secilen owner kullanici bulunamadi' }, { status: 400 });
    }

    return NextResponse.json({
      ...updated.lead,
      takipAt: updated.lead.takipAt ? updated.lead.takipAt.toISOString() : null,
      createdAt: updated.lead.createdAt.toISOString(),
      updatedAt: updated.lead.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('PUT /api/leads/[id] error:', error);
    return NextResponse.json({ error: 'Lead guncellenemedi' }, { status: 500 });
  }
}
