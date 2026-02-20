import { NextResponse } from 'next/server';
import { PersonelRol } from '@prisma/client';
import { requireAuth } from '@/lib/auth/api-auth';
import { prisma } from '@/lib/prisma';
import {
  appointmentCreateSchema,
  findAppointmentOverlap,
  mapAppointmentDto,
  parseAppointmentDateTime,
  resolveNextAppointmentOrder,
  syncServiceLegacyPlanningFields,
} from '@/lib/jobs/appointments';
import { JOB_AUDIT_EVENTS, writeAuditEvent } from '@/lib/audit/events';

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const exists = await prisma.service.findFirst({
      where: {
        id: params.id,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!exists) {
      return NextResponse.json({ error: 'Job bulunamadi' }, { status: 404 });
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        servisId: params.id,
        deletedAt: null,
      },
      orderBy: [{ sira: 'asc' }, { baslangicAt: 'asc' }],
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

    return NextResponse.json({
      appointments: appointments.map(mapAppointmentDto),
    });
  } catch (error) {
    console.error('GET /api/jobs/[id]/appointments error:', error);
    return NextResponse.json({ error: 'Randevular getirilemedi' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = appointmentCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz randevu istegi', details: parsed.error.flatten() },
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

    if (payload.personelId) {
      const personel = await prisma.personel.findFirst({
        where: {
          id: payload.personelId,
          aktif: true,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!personel) {
        return NextResponse.json({ error: 'Secilen personel aktif degil veya bulunamadi' }, { status: 400 });
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const job = await tx.service.findFirst({
        where: {
          id: params.id,
          deletedAt: null,
        },
        select: {
          id: true,
          tekneAdi: true,
        },
      });

      if (!job) {
        throw new Error('JOB_NOT_FOUND');
      }

      const overlap = await findAppointmentOverlap(tx, {
        personelId: payload.personelId ?? null,
        baslangicAt,
        bitisAt,
      });

      if (overlap) {
        return {
          overlap,
        } as const;
      }

      const appointment = await tx.appointment.create({
        data: {
          servisId: params.id,
          personelId: payload.personelId ?? null,
          baslangicAt,
          bitisAt,
          status: payload.status,
          notlar: payload.notlar ?? null,
          kilitli: payload.kilitli ?? false,
          sira: payload.sira ?? (await resolveNextAppointmentOrder(tx, params.id)),
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
              servisId: params.id,
              personelId: appointment.personelId,
            },
          },
          update: {
            rol: PersonelRol.SORUMLU,
          },
          create: {
            servisId: params.id,
            personelId: appointment.personelId,
            rol: PersonelRol.SORUMLU,
          },
        });
      }

      await syncServiceLegacyPlanningFields(tx, params.id);

      await writeAuditEvent(tx, {
        organizationId: 'org_default',
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.APPOINTMENT_CREATED,
        entityTipi: 'Job',
        entityId: params.id,
        detay: `Randevu olusturuldu: ${appointment.id}`,
      });

      return { appointment, job } as const;
    });

    const overlap = 'overlap' in created ? created.overlap : null;
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

    if (!('appointment' in created)) {
      return NextResponse.json({ error: 'Randevu olusturulamadi' }, { status: 500 });
    }

    return NextResponse.json(mapAppointmentDto(created.appointment!), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'JOB_NOT_FOUND') {
      return NextResponse.json({ error: 'Job bulunamadi' }, { status: 404 });
    }
    console.error('POST /api/jobs/[id]/appointments error:', error);
    return NextResponse.json({ error: 'Randevu olusturulamadi' }, { status: 500 });
  }
}
