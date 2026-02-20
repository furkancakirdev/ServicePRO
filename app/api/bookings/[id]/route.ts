import { BookingStatus } from '@prisma/client';
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

const bookingStatusValues = ['YENI', 'ISLEMDE', 'JOB_OLUSTURULDU', 'LEAD_OLUSTURULDU', 'REDDEDILDI'] as const;

const bookingUpdateSchema = z.object({
  kaynak: z.string().trim().max(64).optional().nullable(),
  arayanAd: z.string().trim().max(128).optional().nullable(),
  telefon: z.string().trim().max(32).optional().nullable(),
  email: z.string().trim().max(320).optional().nullable(),
  tekneAd: z.string().trim().max(160).optional().nullable(),
  tekneSeriNo: z.string().trim().max(64).optional().nullable(),
  konu: z.string().trim().max(255).optional().nullable(),
  notlar: z.string().trim().max(4000).optional().nullable(),
  tercihTarih: z.string().trim().min(1).optional().nullable(),
  tercihSaatAraligi: z.string().trim().max(64).optional().nullable(),
  tekneId: z.string().trim().min(1).optional().nullable(),
  ownerUserId: z.string().trim().min(1).optional().nullable(),
  servisId: z.string().trim().min(1).optional().nullable(),
  leadId: z.string().trim().min(1).optional().nullable(),
  status: z.enum(bookingStatusValues).optional(),
});

function toNullableText(value: string | null | undefined): string | null {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function toNullableDateTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  return parseDateTimeInputInTimeZone(value, TR_TIME_ZONE);
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const booking = await prisma.booking.findUnique({
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
        servis: {
          select: {
            id: true,
            tekneAdi: true,
            durum: true,
            servisAciklamasi: true,
          },
        },
        lead: {
          select: {
            id: true,
            ad: true,
            status: true,
            takipAt: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking bulunamadi' }, { status: 404 });
    }

    return NextResponse.json({
      ...booking,
      tercihTarih: booking.tercihTarih ? booking.tercihTarih.toISOString() : null,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('GET /api/bookings/[id] error:', error);
    return NextResponse.json({ error: 'Booking detayi getirilemedi' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const parsed = bookingUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz booking guncelleme istegi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const tercihTarih =
      payload.tercihTarih !== undefined ? toNullableDateTime(payload.tercihTarih) : undefined;
    if (payload.tercihTarih !== undefined && payload.tercihTarih !== null && !tercihTarih) {
      return NextResponse.json(
        { error: 'Tercih tarih/saat bilgisi gecersiz. Beklenen format: YYYY-MM-DDTHH:mm' },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({
        where: { id: params.id },
        select: {
          id: true,
        },
      });

      if (!existing) {
        return { kind: 'NOT_FOUND' as const };
      }

      let tekneId = payload.tekneId;
      let tekneAd = payload.tekneAd !== undefined ? toNullableText(payload.tekneAd) : undefined;

      if (tekneId !== undefined && tekneId !== null) {
        const tekne = await tx.tekne.findFirst({
          where: {
            id: tekneId,
            deletedAt: null,
          },
          select: {
            id: true,
            ad: true,
          },
        });

        if (!tekne) {
          return { kind: 'INVALID_TEKNE' as const };
        }

        tekneId = tekne.id;
        if (!tekneAd) {
          tekneAd = tekne.ad;
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

      if (payload.servisId) {
        const service = await tx.service.findFirst({
          where: {
            id: payload.servisId,
            deletedAt: null,
          },
          select: { id: true },
        });
        if (!service) {
          return { kind: 'INVALID_SERVICE' as const };
        }
      }

      if (payload.leadId) {
        const lead = await tx.lead.findUnique({
          where: { id: payload.leadId },
          select: { id: true },
        });
        if (!lead) {
          return { kind: 'INVALID_LEAD' as const };
        }
      }

      const booking = await tx.booking.update({
        where: { id: params.id },
        data: {
          ...(payload.kaynak !== undefined && { kaynak: toNullableText(payload.kaynak) }),
          ...(payload.arayanAd !== undefined && { arayanAd: toNullableText(payload.arayanAd) }),
          ...(payload.telefon !== undefined && { telefon: toNullableText(payload.telefon) }),
          ...(payload.email !== undefined && { email: toNullableText(payload.email) }),
          ...(tekneAd !== undefined && { tekneAd }),
          ...(payload.tekneSeriNo !== undefined && { tekneSeriNo: toNullableText(payload.tekneSeriNo) }),
          ...(payload.konu !== undefined && { konu: toNullableText(payload.konu) }),
          ...(payload.notlar !== undefined && { notlar: toNullableText(payload.notlar) }),
          ...(payload.tercihSaatAraligi !== undefined && {
            tercihSaatAraligi: toNullableText(payload.tercihSaatAraligi),
          }),
          ...(payload.tercihTarih !== undefined && { tercihTarih }),
          ...(tekneId !== undefined && { tekneId }),
          ...(payload.ownerUserId !== undefined && { ownerUserId: payload.ownerUserId }),
          ...(payload.servisId !== undefined && { servisId: payload.servisId }),
          ...(payload.leadId !== undefined && { leadId: payload.leadId }),
          ...(payload.status !== undefined && { status: payload.status as BookingStatus }),
        },
      });

      await writeAuditEvent(tx, {
        organizationId: 'org_default',
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.BOOKING_UPDATED,
        entityTipi: 'Booking',
        entityId: booking.id,
        detay: `Booking guncellendi. status=${booking.status}`,
      });

      return { kind: 'OK' as const, booking };
    });

    if (updated.kind === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Booking bulunamadi' }, { status: 404 });
    }
    if (updated.kind === 'INVALID_TEKNE') {
      return NextResponse.json({ error: 'Secilen tekne bulunamadi' }, { status: 400 });
    }
    if (updated.kind === 'INVALID_OWNER') {
      return NextResponse.json({ error: 'Secilen owner kullanici bulunamadi' }, { status: 400 });
    }
    if (updated.kind === 'INVALID_SERVICE') {
      return NextResponse.json({ error: 'Secilen job kaydi bulunamadi' }, { status: 400 });
    }
    if (updated.kind === 'INVALID_LEAD') {
      return NextResponse.json({ error: 'Secilen lead kaydi bulunamadi' }, { status: 400 });
    }

    return NextResponse.json({
      ...updated.booking,
      tercihTarih: updated.booking.tercihTarih ? updated.booking.tercihTarih.toISOString() : null,
      createdAt: updated.booking.createdAt.toISOString(),
      updatedAt: updated.booking.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('PUT /api/bookings/[id] error:', error);
    return NextResponse.json({ error: 'Booking guncellenemedi' }, { status: 500 });
  }
}
