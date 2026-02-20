import { NextResponse } from 'next/server';
import { PersonelRol } from '@prisma/client';
import { z } from 'zod';
import { resolveBoatForService, toServisDurumu } from '@/lib/actions/service';
import { JOB_AUDIT_EVENTS, writeAuditEvent } from '@/lib/audit/events';
import {
  appointmentCreateSchema,
  findAppointmentOverlap,
  mapAppointmentDto,
  parseAppointmentDateTime,
  syncServiceLegacyPlanningFields,
} from '@/lib/jobs/appointments';
import { prisma } from '@/lib/prisma';
import { calculateLineTotal, toNullableText } from '@/lib/pricebook/shared';
import { parseDateOnlyToUtcDate } from '@/lib/date-utils';
import { requireAuth } from '@/lib/auth/api-auth';

type RouteContext = {
  params: {
    id: string;
  };
};

const createJobFromTemplateSchema = z.object({
  tarih: z.string().optional().nullable(),
  tahminiBitisTarihi: z.string().optional().nullable(),
  saat: z.string().optional().nullable(),
  isTuru: z.enum(['PAKET', 'ARIZA', 'PROJE']).optional(),
  tekneId: z.string().trim().min(1).optional().nullable(),
  tekneAdi: z.string().trim().min(1).optional().nullable(),
  boatName: z.string().trim().min(1).optional().nullable(),
  adres: z.string().trim().min(1, 'Adres zorunludur'),
  yer: z.string().trim().min(1, 'Lokasyon zorunludur'),
  servisAciklamasi: z.string().trim().min(1).optional().nullable(),
  irtibatKisi: z.string().trim().max(128).optional().nullable(),
  telefon: z.string().trim().max(32).optional().nullable(),
  durum: z.string().optional().nullable(),
  ofisYetkiliId: z.string().trim().min(1).optional().nullable(),
  taseronNotlari: z.string().trim().max(4000).optional().nullable(),
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

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const parsed = createJobFromTemplateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz template job istegi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const created = await prisma.$transaction(async (tx) => {
      const template = await tx.jobTemplate.findUnique({
        where: { id: params.id },
        include: {
          items: {
            orderBy: [{ sira: 'asc' }, { id: 'asc' }],
          },
        },
      });

      if (!template) {
        return {
          kind: 'TEMPLATE_NOT_FOUND' as const,
        };
      }

      if (payload.ofisYetkiliId) {
        const owner = await tx.user.findUnique({
          where: { id: payload.ofisYetkiliId },
          select: { id: true, aktif: true },
        });
        if (!owner || !owner.aktif) {
          return {
            kind: 'INVALID_OWNER' as const,
          };
        }
      }

      const boat = await resolveBoatForService(tx, {
        tekneId: payload.tekneId,
        tekneAdi: payload.tekneAdi,
        boatName: payload.boatName,
      });

      const appointmentInput = payload.firstAppointment;
      let baslangicAt: Date | null = null;
      let bitisAt: Date | null = null;

      if (appointmentInput) {
        baslangicAt = parseAppointmentDateTime(appointmentInput.baslangicAt);
        bitisAt = parseAppointmentDateTime(appointmentInput.bitisAt);

        if (!baslangicAt || !bitisAt || baslangicAt >= bitisAt) {
          return {
            kind: 'INVALID_APPOINTMENT' as const,
          };
        }

        if (appointmentInput.personelId) {
          const personel = await tx.personel.findFirst({
            where: {
              id: appointmentInput.personelId,
              aktif: true,
              deletedAt: null,
            },
            select: { id: true },
          });

          if (!personel) {
            return {
              kind: 'INVALID_PERSONEL' as const,
            };
          }

          const overlap = await findAppointmentOverlap(tx, {
            personelId: appointmentInput.personelId,
            baslangicAt,
            bitisAt,
          });

          if (overlap) {
            throw new AppointmentConflictError(overlap);
          }
        }
      }

      const job = await tx.service.create({
        data: {
          tekneId: boat.tekneId,
          tekneAdi: boat.tekneAdi,
          adres: payload.adres,
          yer: payload.yer,
          servisAciklamasi: toNullableText(payload.servisAciklamasi) ?? `Template: ${template.ad}`,
          tarih: payload.tarih ? parseDateOnlyToUtcDate(payload.tarih) : null,
          tahminiBitisTarihi: payload.tahminiBitisTarihi
            ? parseDateOnlyToUtcDate(payload.tahminiBitisTarihi)
            : null,
          saat: payload.saat ?? null,
          isTuru: payload.isTuru ?? 'PAKET',
          durum: toServisDurumu(payload.durum, toServisDurumu(template.defaultStatus, 'RANDEVU_VERILDI')),
          irtibatKisi: toNullableText(payload.irtibatKisi),
          telefon: toNullableText(payload.telefon),
          ofisYetkiliId: payload.ofisYetkiliId ?? auth.payload.userId,
          taseronNotlari: toNullableText(payload.taseronNotlari) ?? toNullableText(template.defaultNotlar),
        },
      });

      let appointment:
        | {
            id: string;
            servisId: string;
            personelId: string | null;
            baslangicAt: Date;
            bitisAt: Date;
            status: import('@prisma/client').AppointmentStatus;
            confirmedAt: Date | null;
            notlar: string | null;
            sira: number;
            kilitli: boolean;
            createdAt: Date;
            updatedAt: Date;
            personel: { ad: string; unvan: string } | null;
            confirmedBy: { email: string } | null;
          }
        | null = null;

      if (appointmentInput && baslangicAt && bitisAt) {
        appointment = await tx.appointment.create({
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
      }

      for (const item of template.items) {
        await tx.jobLineItem.create({
          data: {
            organizationId: 'org_default',
            servisId: job.id,
            pricebookItemId: item.pricebookItemId,
            ad: item.ad,
            miktar: item.miktar,
            birimFiyat: item.birimFiyat,
            toplam: calculateLineTotal(item.miktar, item.birimFiyat),
            notlar: null,
          },
        });
      }

      await writeAuditEvent(tx, {
        organizationId: 'org_default',
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.JOB_CREATED,
        entityTipi: 'Job',
        entityId: job.id,
        detay: `Template ile job olusturuldu: ${template.ad}`,
      });

      if (appointment) {
        await writeAuditEvent(tx, {
          organizationId: 'org_default',
          userId: auth.payload.userId,
          userEmail: auth.payload.email,
          islemTuru: JOB_AUDIT_EVENTS.APPOINTMENT_CREATED,
          entityTipi: 'Job',
          entityId: job.id,
          detay: `Template job ilk randevu olusturuldu: ${appointment.id}`,
        });
      }

      await writeAuditEvent(tx, {
        organizationId: 'org_default',
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.TEMPLATE_CREATED_JOB,
        entityTipi: 'JobTemplate',
        entityId: template.id,
        detay: `Template job olusturma: ${template.ad} -> ${job.id}`,
      });

      return {
        kind: 'OK' as const,
        template,
        job,
        appointment,
      };
    });

    if (created.kind === 'TEMPLATE_NOT_FOUND') {
      return NextResponse.json({ error: 'Template bulunamadi' }, { status: 404 });
    }
    if (created.kind === 'INVALID_OWNER') {
      return NextResponse.json({ error: 'Secilen owner kullanici bulunamadi' }, { status: 400 });
    }
    if (created.kind === 'INVALID_APPOINTMENT') {
      return NextResponse.json({ error: 'Ilk randevu bilgisi gecersiz' }, { status: 400 });
    }
    if (created.kind === 'INVALID_PERSONEL') {
      return NextResponse.json({ error: 'Secilen personel aktif degil veya bulunamadi' }, { status: 400 });
    }

    return NextResponse.json(
      {
        templateId: created.template.id,
        jobId: created.job.id,
        job: created.job,
        firstAppointment: created.appointment ? mapAppointmentDto(created.appointment) : null,
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

    if (error instanceof Error && error.message.includes('Tekne')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('POST /api/templates/jobs/[id]/create-job error:', error);
    return NextResponse.json({ error: 'Template ile job olusturulamadi' }, { status: 500 });
  }
}
