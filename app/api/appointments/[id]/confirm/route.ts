import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import { prisma } from '@/lib/prisma';
import { mapAppointmentDto } from '@/lib/jobs/appointments';
import { JOB_AUDIT_EVENTS, writeAuditEvent } from '@/lib/audit/events';

type RouteContext = {
  params: {
    id: string;
  };
};

const confirmSchema = z.object({
  confirmed: z.boolean().optional().default(true),
});

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const parsed = confirmSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz onay istegi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const confirmed = parsed.data.confirmed;

    const updated = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findFirst({
        where: {
          id: params.id,
          deletedAt: null,
        },
        include: {
          personel: {
            select: {
              ad: true,
              unvan: true,
            },
          },
          confirmedBy: {
            select: {
              email: true,
            },
          },
        },
      });

      if (!appointment) return null;

      const nextStatus =
        confirmed && (appointment.status === 'PLANLANDI' || appointment.status === 'ONAY_BEKLIYOR')
          ? 'ONAYLANDI'
          : appointment.status;

      const result = await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          confirmedAt: confirmed ? new Date() : null,
          confirmedById: confirmed ? auth.payload.userId : null,
          status: nextStatus,
        },
        include: {
          personel: {
            select: {
              ad: true,
              unvan: true,
            },
          },
          confirmedBy: {
            select: {
              email: true,
            },
          },
        },
      });

      await writeAuditEvent(tx, {
        organizationId: 'org_default',
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: confirmed
          ? JOB_AUDIT_EVENTS.APPOINTMENT_CONFIRMED
          : JOB_AUDIT_EVENTS.APPOINTMENT_UNCONFIRMED,
        entityTipi: 'Job',
        entityId: appointment.servisId,
        detay: `Randevu ${confirmed ? 'onaylandi' : 'onayi kaldirildi'}: ${appointment.id}`,
      });

      return result;
    });

    if (!updated) {
      return NextResponse.json({ error: 'Randevu bulunamadi' }, { status: 404 });
    }

    return NextResponse.json(mapAppointmentDto(updated));
  } catch (error) {
    console.error('POST /api/appointments/[id]/confirm error:', error);
    return NextResponse.json({ error: 'Randevu onayi kaydedilemedi' }, { status: 500 });
  }
}
