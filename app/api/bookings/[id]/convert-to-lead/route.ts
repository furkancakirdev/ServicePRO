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

const convertToLeadSchema = z.object({
  takipAt: z.string().trim().min(1).optional().nullable(),
  ownerUserId: z.string().trim().min(1).optional().nullable(),
  status: z.enum(['YENI', 'TAKIPTE', 'TEKLIF_BEKLIYOR', 'KAYBEDILDI', 'KAZANILDI']).optional(),
  notlar: z.string().trim().max(4000).optional().nullable(),
});

function toNullableText(value: string | null | undefined): string | null {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function parseTakipAt(value: string | null | undefined): Date | null {
  if (!value) return null;
  return parseDateTimeInputInTimeZone(value, TR_TIME_ZONE);
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const parsed = convertToLeadSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz convert-to-lead istegi', details: parsed.error.flatten() },
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

    const converted = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: params.id },
      });

      if (!booking) {
        return { kind: 'NOT_FOUND' as const };
      }

      if (booking.servisId) {
        return {
          kind: 'ALREADY_JOB' as const,
          servisId: booking.servisId,
        };
      }

      const ownerUserId = payload.ownerUserId ?? booking.ownerUserId ?? auth.payload.userId;
      if (ownerUserId) {
        const owner = await tx.user.findUnique({
          where: { id: ownerUserId },
          select: { id: true },
        });
        if (!owner) {
          return { kind: 'INVALID_OWNER' as const };
        }
      }

      let lead = booking.leadId
        ? await tx.lead.findUnique({
            where: { id: booking.leadId },
          })
        : null;

      if (!lead) {
        lead = await tx.lead.create({
          data: {
            organizationId: booking.organizationId,
            kaynak: booking.kaynak,
            ad: booking.arayanAd,
            telefon: booking.telefon,
            email: booking.email,
            konu: booking.konu,
            notlar: toNullableText(payload.notlar) ?? booking.notlar,
            status: (payload.status ?? 'YENI') as LeadStatus,
            takipAt,
            tekneId: booking.tekneId,
            ownerUserId,
          },
        });

        await writeAuditEvent(tx, {
          organizationId: booking.organizationId,
          userId: auth.payload.userId,
          userEmail: auth.payload.email,
          islemTuru: JOB_AUDIT_EVENTS.LEAD_CREATED,
          entityTipi: 'Lead',
          entityId: lead.id,
          detay: `Booking conversion ile lead olusturuldu: booking=${booking.id}`,
        });
      } else {
        lead = await tx.lead.update({
          where: { id: lead.id },
          data: {
            ...(payload.notlar !== undefined && {
              notlar: toNullableText(payload.notlar),
            }),
            ...(payload.status !== undefined && {
              status: payload.status as LeadStatus,
            }),
            ...(payload.takipAt !== undefined && {
              takipAt,
            }),
            ...(payload.ownerUserId !== undefined && {
              ownerUserId: payload.ownerUserId,
            }),
          },
        });

        await writeAuditEvent(tx, {
          organizationId: booking.organizationId,
          userId: auth.payload.userId,
          userEmail: auth.payload.email,
          islemTuru: JOB_AUDIT_EVENTS.LEAD_UPDATED,
          entityTipi: 'Lead',
          entityId: lead.id,
          detay: `Booking conversion ile lead guncellendi: booking=${booking.id}`,
        });
      }

      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          leadId: lead.id,
          status: 'LEAD_OLUSTURULDU',
          ownerUserId,
        },
        include: {
          lead: true,
          servis: {
            select: {
              id: true,
            },
          },
        },
      });

      await writeAuditEvent(tx, {
        organizationId: booking.organizationId,
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.BOOKING_CONVERTED_TO_LEAD,
        entityTipi: 'Booking',
        entityId: booking.id,
        detay: `Booking leade donusturuldu: lead=${lead.id}`,
      });

      return {
        kind: 'OK' as const,
        booking: updatedBooking,
        lead,
      };
    });

    if (converted.kind === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Booking bulunamadi' }, { status: 404 });
    }
    if (converted.kind === 'ALREADY_JOB') {
      return NextResponse.json(
        { error: 'Bu booking zaten joba donusturulmus', servisId: converted.servisId },
        { status: 409 }
      );
    }
    if (converted.kind === 'INVALID_OWNER') {
      return NextResponse.json({ error: 'Secilen owner kullanici bulunamadi' }, { status: 400 });
    }

    return NextResponse.json({
      booking: {
        ...converted.booking,
        tercihTarih: converted.booking.tercihTarih
          ? converted.booking.tercihTarih.toISOString()
          : null,
        createdAt: converted.booking.createdAt.toISOString(),
        updatedAt: converted.booking.updatedAt.toISOString(),
      },
      lead: {
        ...converted.lead,
        takipAt: converted.lead.takipAt ? converted.lead.takipAt.toISOString() : null,
        createdAt: converted.lead.createdAt.toISOString(),
        updatedAt: converted.lead.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('POST /api/bookings/[id]/convert-to-lead error:', error);
    return NextResponse.json({ error: 'Booking leade donusturulemedi' }, { status: 500 });
  }
}
