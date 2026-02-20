import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import { JOB_AUDIT_EVENTS, writeAuditEvent } from '@/lib/audit/events';
import { mapAppointmentDto } from '@/lib/jobs/appointments';
import { prisma } from '@/lib/prisma';

const lockSchema = z.object({
  appointmentId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const parsed = lockSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz lock istegi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.appointment.findFirst({
        where: {
          id: parsed.data.appointmentId,
          deletedAt: null,
        },
        select: {
          id: true,
          servisId: true,
          kilitli: true,
        },
      });

      if (!existing) return null;

      const updated = await tx.appointment.update({
        where: { id: existing.id },
        data: {
          kilitli: true,
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
          servis: {
            select: {
              id: true,
              tekneAdi: true,
              servisAciklamasi: true,
              yer: true,
              adres: true,
              durum: true,
            },
          },
        },
      });

      if (!existing.kilitli) {
        await writeAuditEvent(tx, {
          organizationId: 'org_default',
          userId: auth.payload.userId,
          userEmail: auth.payload.email,
          islemTuru: JOB_AUDIT_EVENTS.APPOINTMENT_LOCKED,
          entityTipi: 'Job',
          entityId: existing.servisId,
          detay: `Randevu kilitlendi: ${existing.id}`,
        });
      }

      return updated;
    });

    if (!result) {
      return NextResponse.json({ error: 'Randevu bulunamadi' }, { status: 404 });
    }

    return NextResponse.json({
      ...mapAppointmentDto(result),
      job: result.servis,
    });
  } catch (error) {
    console.error('POST /api/dispatch/lock error:', error);
    return NextResponse.json({ error: 'Randevu kilitlenemedi' }, { status: 500 });
  }
}
