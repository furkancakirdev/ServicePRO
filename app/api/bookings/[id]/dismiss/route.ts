import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import { JOB_AUDIT_EVENTS, writeAuditEvent } from '@/lib/audit/events';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: {
    id: string;
  };
};

const dismissSchema = z.object({
  reason: z.string().trim().max(512).optional().nullable(),
});

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const parsed = dismissSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz dismiss istegi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const reason = parsed.data.reason?.trim();

    const updated = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: params.id },
      });

      if (!booking) {
        return { kind: 'NOT_FOUND' as const };
      }

      const nextNotes = reason
        ? [booking.notlar?.trim(), `[DISMISS] ${reason}`].filter(Boolean).join('\n')
        : booking.notlar;

      const dismissed = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'REDDEDILDI',
          notlar: nextNotes,
        },
      });

      await writeAuditEvent(tx, {
        organizationId: booking.organizationId,
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.BOOKING_DISMISSED,
        entityTipi: 'Booking',
        entityId: booking.id,
        detay: reason ? `Booking reddedildi: ${reason}` : 'Booking reddedildi',
      });

      return {
        kind: 'OK' as const,
        booking: dismissed,
      };
    });

    if (updated.kind === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Booking bulunamadi' }, { status: 404 });
    }

    return NextResponse.json({
      ...updated.booking,
      tercihTarih: updated.booking.tercihTarih ? updated.booking.tercihTarih.toISOString() : null,
      createdAt: updated.booking.createdAt.toISOString(),
      updatedAt: updated.booking.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('POST /api/bookings/[id]/dismiss error:', error);
    return NextResponse.json({ error: 'Booking reddedilemedi' }, { status: 500 });
  }
}
