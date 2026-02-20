import { NextResponse } from 'next/server';
import { PersonelRol } from '@prisma/client';
import { z } from 'zod';
import { GET as getServices, POST as postService } from '@/app/api/services/route';
import { requireAuth } from '@/lib/auth/api-auth';
import { resolveBoatForService, toServisDurumu } from '@/lib/actions/service';
import { prisma } from '@/lib/prisma';
import {
  appointmentCreateSchema,
  findAppointmentOverlap,
  mapAppointmentDto,
  parseAppointmentDateTime,
  syncServiceLegacyPlanningFields,
} from '@/lib/jobs/appointments';
import { writeAuditEvent, JOB_AUDIT_EVENTS } from '@/lib/audit/events';
import { parseDateOnlyToUtcDate } from '@/lib/date-utils';

const createJobSchema = z.object({
  tarih: z.string().optional().nullable(),
  tahminiBitisTarihi: z.string().optional().nullable(),
  saat: z.string().optional().nullable(),
  isTuru: z.enum(['PAKET', 'ARIZA', 'PROJE']).optional(),
  tekneId: z.string().optional().nullable(),
  tekneAdi: z.string().optional().nullable(),
  boatName: z.string().optional().nullable(),
  adres: z.string().min(1, 'Adres zorunludur'),
  yer: z.string().min(1, 'Lokasyon zorunludur'),
  servisAciklamasi: z.string().min(1, 'Aciklama zorunludur'),
  irtibatKisi: z.string().optional().nullable(),
  telefon: z.string().optional().nullable(),
  durum: z.string().optional().nullable(),
  ofisYetkiliId: z.string().optional().nullable(),
  taseronNotlari: z.string().optional().nullable(),
  firstAppointment: appointmentCreateSchema.optional(),
});

class AppointmentConflictError extends Error {
  constructor(
    public readonly conflict: {
      id: string;
      servisId: string;
      baslangicAt: Date;
      bitisAt: Date;
      status: string;
      servis: {
        tekneAdi: string;
        servisAciklamasi: string;
      };
    }
  ) {
    super('Secilen teknisyen icin bu saat araliginda cakisan bir randevu var.');
    this.name = 'AppointmentConflictError';
  }
}

export async function GET(request: Request) {
  return getServices(request);
}

export async function POST(request: Request) {
  let rawBody = '';
  try {
    rawBody = await request.text();
    const body = JSON.parse(rawBody) as Record<string, unknown>;

    if (!('firstAppointment' in body) || !body.firstAppointment) {
      const proxyRequest = new Request(request.url, {
        method: 'POST',
        headers: request.headers,
        body: rawBody,
      });
      return postService(proxyRequest);
    }

    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const parsed = createJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz istek', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const appointmentInput = payload.firstAppointment;
    if (!appointmentInput) {
      return NextResponse.json({ error: 'Randevu bilgisi zorunludur' }, { status: 400 });
    }

    const baslangicAt = parseAppointmentDateTime(appointmentInput.baslangicAt);
    const bitisAt = parseAppointmentDateTime(appointmentInput.bitisAt);

    if (!baslangicAt || !bitisAt) {
      return NextResponse.json({ error: 'Randevu tarih/saat bilgisi gecersiz' }, { status: 400 });
    }
    if (baslangicAt >= bitisAt) {
      return NextResponse.json(
        { error: 'Randevu bitis zamani baslangictan sonra olmalidir' },
        { status: 400 }
      );
    }

    if (appointmentInput.personelId) {
      const personel = await prisma.personel.findFirst({
        where: {
          id: appointmentInput.personelId,
          aktif: true,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!personel) {
        return NextResponse.json({ error: 'Secilen personel aktif degil veya bulunamadi' }, { status: 400 });
      }
    }

    const boat = await resolveBoatForService(prisma, {
      tekneId: payload.tekneId,
      tekneAdi: payload.tekneAdi,
      boatName: payload.boatName,
    });

    const created = await prisma.$transaction(async (tx) => {
      const overlap = await findAppointmentOverlap(tx, {
        personelId: appointmentInput.personelId ?? null,
        baslangicAt,
        bitisAt,
      });

      if (overlap) {
        throw new AppointmentConflictError(overlap);
      }

      const job = await tx.service.create({
        data: {
          tekneId: boat.tekneId,
          tekneAdi: boat.tekneAdi,
          adres: payload.adres,
          yer: payload.yer,
          servisAciklamasi: payload.servisAciklamasi,
          tarih: payload.tarih ? parseDateOnlyToUtcDate(payload.tarih) : null,
          tahminiBitisTarihi: payload.tahminiBitisTarihi
            ? parseDateOnlyToUtcDate(payload.tahminiBitisTarihi)
            : null,
          saat: payload.saat ?? null,
          isTuru: payload.isTuru ?? 'PAKET',
          durum: toServisDurumu(payload.durum, 'RANDEVU_VERILDI'),
          irtibatKisi: payload.irtibatKisi ?? null,
          telefon: payload.telefon ?? null,
          ofisYetkiliId: payload.ofisYetkiliId ?? auth.payload.userId,
          taseronNotlari: payload.taseronNotlari ?? null,
        },
      });

      const appointment = await tx.appointment.create({
        data: {
          servisId: job.id,
          personelId: appointmentInput.personelId ?? null,
          baslangicAt,
          bitisAt,
          status: appointmentInput.status,
          notlar: appointmentInput.notlar ?? null,
          sira: appointmentInput.sira ?? 0,
          kilitli: appointmentInput.kilitli ?? false,
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
              servisId: job.id,
              personelId: appointment.personelId,
            },
          },
          update: {
            rol: PersonelRol.SORUMLU,
          },
          create: {
            servisId: job.id,
            personelId: appointment.personelId,
            rol: PersonelRol.SORUMLU,
          },
        });
      }

      await syncServiceLegacyPlanningFields(tx, job.id);

      await writeAuditEvent(tx, {
        organizationId: 'org_default',
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.JOB_CREATED,
        entityTipi: 'Job',
        entityId: job.id,
        detay: `Job olusturuldu: ${job.tekneAdi}`,
      });

      await writeAuditEvent(tx, {
        organizationId: 'org_default',
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.APPOINTMENT_CREATED,
        entityTipi: 'Job',
        entityId: job.id,
        detay: `Ilk randevu olusturuldu: ${appointment.id}`,
      });

      return {
        job,
        appointment,
      };
    });

    return NextResponse.json(
      {
        ...created.job,
        firstAppointment: mapAppointmentDto(created.appointment),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AppointmentConflictError) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'APPOINTMENT_OVERLAP',
          conflict: {
            ...error.conflict,
            baslangicAt: error.conflict.baslangicAt.toISOString(),
            bitisAt: error.conflict.bitisAt.toISOString(),
          },
        },
        { status: 409 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Gecersiz JSON govdesi' }, { status: 400 });
    }

    console.error('POST /api/jobs error:', error);
    return NextResponse.json({ error: 'Job olusturulamadi' }, { status: 500 });
  }
}
