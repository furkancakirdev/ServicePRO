import { NextResponse } from 'next/server';
import { PersonelRol } from '@prisma/client';
import { requireAuth } from '@/lib/auth/api-auth';
import { prisma } from '@/lib/prisma';
import {
  appointmentUpdateSchema,
  findAppointmentOverlap,
  mapAppointmentDto,
  parseAppointmentDateTime,
  syncServiceLegacyPlanningFields,
} from '@/lib/jobs/appointments';
import { JOB_AUDIT_EVENTS, writeAuditEvent } from '@/lib/audit/events';

type RouteContext = {
  params: {
    id: string;
  };
};

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = appointmentUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz randevu guncelleme istegi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.appointment.findFirst({
      where: {
        id: params.id,
        deletedAt: null,
      },
      select: {
        id: true,
        servisId: true,
        personelId: true,
        baslangicAt: true,
        bitisAt: true,
        status: true,
        notlar: true,
        sira: true,
        kilitli: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Randevu bulunamadi' }, { status: 404 });
    }

    const payload = parsed.data;
    const baslangicAt = payload.baslangicAt
      ? parseAppointmentDateTime(payload.baslangicAt)
      : existing.baslangicAt;
    const bitisAt = payload.bitisAt ? parseAppointmentDateTime(payload.bitisAt) : existing.bitisAt;

    if (!baslangicAt || !bitisAt) {
      return NextResponse.json({ error: 'Randevu tarih/saat bilgisi gecersiz' }, { status: 400 });
    }
    if (baslangicAt >= bitisAt) {
      return NextResponse.json(
        { error: 'Randevu bitis zamani baslangictan sonra olmalidir' },
        { status: 400 }
      );
    }

    const nextPersonelId =
      payload.personelId === undefined ? existing.personelId : payload.personelId ?? null;

    if (nextPersonelId) {
      const personel = await prisma.personel.findFirst({
        where: {
          id: nextPersonelId,
          aktif: true,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!personel) {
        return NextResponse.json({ error: 'Secilen personel aktif degil veya bulunamadi' }, { status: 400 });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const overlap = await findAppointmentOverlap(tx, {
        personelId: nextPersonelId,
        baslangicAt,
        bitisAt,
        excludeAppointmentId: existing.id,
      });

      if (overlap) {
        return {
          overlap,
        } as const;
      }

      const appointment = await tx.appointment.update({
        where: { id: existing.id },
        data: {
          baslangicAt,
          bitisAt,
          personelId: nextPersonelId,
          status: payload.status ?? existing.status,
          notlar: payload.notlar !== undefined ? payload.notlar : existing.notlar,
          sira: payload.sira ?? existing.sira,
          kilitli: payload.kilitli ?? existing.kilitli,
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

      if (appointment.personelId) {
        await tx.servicePersonel.upsert({
          where: {
            servisId_personelId: {
              servisId: appointment.servisId,
              personelId: appointment.personelId,
            },
          },
          update: {
            rol: PersonelRol.SORUMLU,
          },
          create: {
            servisId: appointment.servisId,
            personelId: appointment.personelId,
            rol: PersonelRol.SORUMLU,
          },
        });
      }

      await syncServiceLegacyPlanningFields(tx, appointment.servisId);

      await writeAuditEvent(tx, {
        organizationId: 'org_default',
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.APPOINTMENT_UPDATED,
        entityTipi: 'Job',
        entityId: appointment.servisId,
        detay: `Randevu guncellendi: ${appointment.id}`,
      });

      if (existing.kilitli !== appointment.kilitli) {
        await writeAuditEvent(tx, {
          organizationId: 'org_default',
          userId: auth.payload.userId,
          userEmail: auth.payload.email,
          islemTuru: appointment.kilitli
            ? JOB_AUDIT_EVENTS.APPOINTMENT_LOCKED
            : JOB_AUDIT_EVENTS.APPOINTMENT_UNLOCKED,
          entityTipi: 'Job',
          entityId: appointment.servisId,
          detay: `Randevu ${appointment.kilitli ? 'kilitlendi' : 'kilidi acildi'}: ${appointment.id}`,
        });
      }

      return { appointment } as const;
    });

    const overlap = 'overlap' in updated ? updated.overlap : null;
    if (overlap) {
      return NextResponse.json(
        {
          error: 'Secilen teknisyen icin bu saat araliginda cakisan bir randevu var.',
          code: 'APPOINTMENT_OVERLAP',
          conflict: {
            ...overlap,
            baslangicAt: overlap.baslangicAt.toISOString(),
            bitisAt: overlap.bitisAt.toISOString(),
          },
        },
        { status: 409 }
      );
    }

    if (!('appointment' in updated)) {
      return NextResponse.json({ error: 'Randevu guncellenemedi' }, { status: 500 });
    }

    return NextResponse.json(mapAppointmentDto(updated.appointment!));
  } catch (error) {
    console.error('PUT /api/appointments/[id] error:', error);
    return NextResponse.json({ error: 'Randevu guncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const deleted = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findFirst({
        where: {
          id: params.id,
          deletedAt: null,
        },
        select: {
          id: true,
          servisId: true,
        },
      });

      if (!appointment) return null;

      await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          deletedAt: new Date(),
        },
      });

      await syncServiceLegacyPlanningFields(tx, appointment.servisId);

      await writeAuditEvent(tx, {
        organizationId: 'org_default',
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.APPOINTMENT_DELETED,
        entityTipi: 'Job',
        entityId: appointment.servisId,
        detay: `Randevu silindi: ${appointment.id}`,
      });

      return appointment;
    });

    if (!deleted) {
      return NextResponse.json({ error: 'Randevu bulunamadi' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/appointments/[id] error:', error);
    return NextResponse.json({ error: 'Randevu silinemedi' }, { status: 500 });
  }
}
