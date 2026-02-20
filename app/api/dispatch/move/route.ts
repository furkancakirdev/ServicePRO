import { NextResponse } from 'next/server';
import { PersonelRol } from '@prisma/client';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import { JOB_AUDIT_EVENTS, writeAuditEvent } from '@/lib/audit/events';
import {
  findAppointmentOverlap,
  mapAppointmentDto,
  parseAppointmentDateTime,
  syncServiceLegacyPlanningFields,
} from '@/lib/jobs/appointments';
import { prisma } from '@/lib/prisma';

const moveSchema = z.object({
  appointmentId: z.string().min(1),
  personelId: z.string().trim().min(1).nullable().optional(),
  baslangicAt: z.string().min(1),
  bitisAt: z.string().min(1),
  optimisticLockVersion: z.string().datetime().optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const parsed = moveSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz dispatch move istegi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const baslangicAt = parseAppointmentDateTime(payload.baslangicAt);
    const bitisAt = parseAppointmentDateTime(payload.bitisAt);
    if (!baslangicAt || !bitisAt) {
      return NextResponse.json({ error: 'Randevu tarih/saat bilgisi gecersiz' }, { status: 400 });
    }
    if (baslangicAt >= bitisAt) {
      return NextResponse.json(
        { error: 'Randevu bitis zamani baslangictan sonra olmalidir' },
        { status: 400 }
      );
    }

    const moved = await prisma.$transaction(async (tx) => {
      const existing = await tx.appointment.findFirst({
        where: {
          id: payload.appointmentId,
          deletedAt: null,
        },
        select: {
          id: true,
          servisId: true,
          personelId: true,
          baslangicAt: true,
          bitisAt: true,
          kilitli: true,
          updatedAt: true,
        },
      });

      if (!existing) {
        return { kind: 'NOT_FOUND' as const };
      }

      if (existing.kilitli) {
        return { kind: 'LOCKED' as const };
      }

      if (
        payload.optimisticLockVersion &&
        existing.updatedAt.toISOString() !== payload.optimisticLockVersion
      ) {
        return {
          kind: 'OPTIMISTIC_LOCK' as const,
          currentUpdatedAt: existing.updatedAt.toISOString(),
        };
      }

      const nextPersonelId =
        payload.personelId === undefined ? existing.personelId : payload.personelId ?? null;

      if (nextPersonelId) {
        const personel = await tx.personel.findFirst({
          where: {
            id: nextPersonelId,
            aktif: true,
            deletedAt: null,
          },
          select: { id: true },
        });
        if (!personel) {
          return { kind: 'INVALID_PERSONEL' as const };
        }
      }

      const overlap = await findAppointmentOverlap(tx, {
        personelId: nextPersonelId,
        baslangicAt,
        bitisAt,
        excludeAppointmentId: existing.id,
      });

      if (overlap) {
        return {
          kind: 'OVERLAP' as const,
          overlap,
        };
      }

      const updated = await tx.appointment.update({
        where: { id: existing.id },
        data: {
          personelId: nextPersonelId,
          baslangicAt,
          bitisAt,
        },
        include: {
          personel: {
            select: {
              id: true,
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

      if (updated.personelId) {
        await tx.servicePersonel.upsert({
          where: {
            servisId_personelId: {
              servisId: updated.servisId,
              personelId: updated.personelId,
            },
          },
          update: {
            rol: PersonelRol.SORUMLU,
          },
          create: {
            servisId: updated.servisId,
            personelId: updated.personelId,
            rol: PersonelRol.SORUMLU,
          },
        });
      }

      await syncServiceLegacyPlanningFields(tx, updated.servisId);

      await writeAuditEvent(tx, {
        organizationId: 'org_default',
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.APPOINTMENT_UPDATED,
        entityTipi: 'Job',
        entityId: updated.servisId,
        detay: `Dispatch move: ${updated.id} -> personel=${updated.personelId ?? 'UNASSIGNED'} ${updated.baslangicAt.toISOString()}-${updated.bitisAt.toISOString()}`,
      });

      return {
        kind: 'OK' as const,
        appointment: updated,
      };
    });

    if (moved.kind === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Randevu bulunamadi' }, { status: 404 });
    }
    if (moved.kind === 'LOCKED') {
      return NextResponse.json(
        { error: 'Kilitli randevu tasinamaz', code: 'APPOINTMENT_LOCKED' },
        { status: 409 }
      );
    }
    if (moved.kind === 'OPTIMISTIC_LOCK') {
      return NextResponse.json(
        {
          error: 'Randevu baska bir kullanici tarafindan guncellendi',
          code: 'OPTIMISTIC_LOCK_FAILED',
          currentUpdatedAt: moved.currentUpdatedAt,
        },
        { status: 409 }
      );
    }
    if (moved.kind === 'INVALID_PERSONEL') {
      return NextResponse.json(
        { error: 'Secilen personel aktif degil veya bulunamadi' },
        { status: 400 }
      );
    }
    if (moved.kind === 'OVERLAP') {
      return NextResponse.json(
        {
          error: 'Secilen teknisyen icin bu saat araliginda cakisan bir randevu var.',
          code: 'APPOINTMENT_OVERLAP',
          conflict: {
            ...moved.overlap,
            baslangicAt: moved.overlap.baslangicAt.toISOString(),
            bitisAt: moved.overlap.bitisAt.toISOString(),
          },
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ...mapAppointmentDto(moved.appointment),
      job: moved.appointment.servis,
    });
  } catch (error) {
    console.error('POST /api/dispatch/move error:', error);
    return NextResponse.json({ error: 'Dispatch move kaydedilemedi' }, { status: 500 });
  }
}
