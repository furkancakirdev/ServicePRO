import { BookingStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import { JOB_AUDIT_EVENTS, writeAuditEvent } from '@/lib/audit/events';
import { parseDateTimeInputInTimeZone, TR_TIME_ZONE } from '@/lib/timezone';
import { prisma } from '@/lib/prisma';

const bookingStatusValues = ['YENI', 'ISLEMDE', 'JOB_OLUSTURULDU', 'LEAD_OLUSTURULDU', 'REDDEDILDI'] as const;

const bookingCreateSchema = z.object({
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
  status: z.enum(bookingStatusValues).optional(),
});

function toNullableText(value: string | null | undefined): string | null {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function parsePreferenceDateTime(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  return parseDateTimeInputInTimeZone(raw, TR_TIME_ZONE);
}

function parseStatusFilter(raw: string | null): BookingStatus | null {
  if (!raw) return null;
  return bookingStatusValues.includes(raw as BookingStatus) ? (raw as BookingStatus) : null;
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() ?? '';
    const status = parseStatusFilter(searchParams.get('status'));
    const ownerUserId = searchParams.get('owner')?.trim() ?? '';

    const bookings = await prisma.booking.findMany({
      where: {
        status: status ?? undefined,
        ownerUserId: ownerUserId || undefined,
        OR: q
          ? [
              { telefon: { contains: q, mode: 'insensitive' } },
              { arayanAd: { contains: q, mode: 'insensitive' } },
              { tekneAd: { contains: q, mode: 'insensitive' } },
              { konu: { contains: q, mode: 'insensitive' } },
            ]
          : undefined,
      },
      orderBy: [{ createdAt: 'desc' }],
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
          },
        },
        lead: {
          select: {
            id: true,
            status: true,
            takipAt: true,
          },
        },
      },
      take: 500,
    });

    return NextResponse.json({
      bookings: bookings.map((booking) => ({
        ...booking,
        tercihTarih: booking.tercihTarih ? booking.tercihTarih.toISOString() : null,
        createdAt: booking.createdAt.toISOString(),
        updatedAt: booking.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('GET /api/bookings error:', error);
    return NextResponse.json({ error: 'Booking listesi getirilemedi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const parsed = bookingCreateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz booking istegi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const tercihTarih = parsePreferenceDateTime(payload.tercihTarih);
    if (payload.tercihTarih && !tercihTarih) {
      return NextResponse.json(
        { error: 'Tercih tarih/saat bilgisi gecersiz. Beklenen format: YYYY-MM-DDTHH:mm' },
        { status: 400 }
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      let tekneId = payload.tekneId ?? null;
      let tekneAd = toNullableText(payload.tekneAd);

      if (tekneId) {
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

      const booking = await tx.booking.create({
        data: {
          organizationId: 'org_default',
          kaynak: toNullableText(payload.kaynak),
          arayanAd: toNullableText(payload.arayanAd),
          telefon: toNullableText(payload.telefon),
          email: toNullableText(payload.email),
          tekneAd,
          tekneSeriNo: toNullableText(payload.tekneSeriNo),
          konu: toNullableText(payload.konu),
          notlar: toNullableText(payload.notlar),
          tercihTarih,
          tercihSaatAraligi: toNullableText(payload.tercihSaatAraligi),
          tekneId,
          ownerUserId,
          status: payload.status ?? 'YENI',
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
      });

      await writeAuditEvent(tx, {
        organizationId: 'org_default',
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.BOOKING_CREATED,
        entityTipi: 'Booking',
        entityId: booking.id,
        detay: `Booking olusturuldu: ${booking.telefon ?? '-'} / ${booking.tekneAd ?? '-'}`,
      });

      return { kind: 'OK' as const, booking };
    });

    if (created.kind === 'INVALID_TEKNE') {
      return NextResponse.json({ error: 'Secilen tekne bulunamadi' }, { status: 400 });
    }
    if (created.kind === 'INVALID_OWNER') {
      return NextResponse.json({ error: 'Secilen owner kullanici bulunamadi' }, { status: 400 });
    }

    return NextResponse.json(
      {
        ...created.booking,
        tercihTarih: created.booking.tercihTarih ? created.booking.tercihTarih.toISOString() : null,
        createdAt: created.booking.createdAt.toISOString(),
        updatedAt: created.booking.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/bookings error:', error);
    return NextResponse.json({ error: 'Booking olusturulamadi' }, { status: 500 });
  }
}
