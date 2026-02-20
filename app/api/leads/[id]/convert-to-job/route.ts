import { PersonelRol } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/api-auth';
import { resolveBoatForService, toServisDurumu } from '@/lib/actions/service';
import { JOB_AUDIT_EVENTS, writeAuditEvent } from '@/lib/audit/events';
import { findAppointmentOverlap, mapAppointmentDto, syncServiceLegacyPlanningFields } from '@/lib/jobs/appointments';
import { parseDateTimeInputInTimeZone, TR_TIME_ZONE } from '@/lib/timezone';
import { toDateOnlyISO } from '@/lib/date-utils';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: {
    id: string;
  };
};

const convertLeadToJobSchema = z.object({
  personelId: z.string().trim().min(1).nullable().optional(),
  baslangicAt: z.string().trim().min(1).optional(),
  bitisAt: z.string().trim().min(1).optional(),
  tercihSaatAraligi: z.string().trim().max(64).optional(),
  adres: z.string().trim().min(1).optional(),
  yer: z.string().trim().min(1).optional(),
  servisAciklamasi: z.string().trim().min(1).optional(),
  isTuru: z.enum(['PAKET', 'ARIZA', 'PROJE']).optional(),
  durum: z.string().trim().optional(),
  ownerUserId: z.string().trim().min(1).optional(),
  tekneId: z.string().trim().min(1).optional(),
  tekneAdi: z.string().trim().min(1).optional(),
});

function parseHourMinuteRange(raw: string | null | undefined): { start: string; end: string } | null {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  const match = value.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (!match) return null;
  const normalize = (time: string) => {
    const [hour, minute] = time.split(':').map((part) => Number(part));
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };
  const start = normalize(match[1]);
  const end = normalize(match[2]);
  if (!start || !end) return null;
  return { start, end };
}

function resolveAppointmentWindow(input: {
  requestedStart: string | undefined;
  requestedEnd: string | undefined;
  requestedRange: string | undefined;
  leadFollowAt: Date | null;
}): { startAt: Date; endAt: Date } | { error: string } {
  const explicitStart = input.requestedStart
    ? parseDateTimeInputInTimeZone(input.requestedStart, TR_TIME_ZONE)
    : null;
  if (input.requestedStart && !explicitStart) {
    return { error: 'Baslangic tarihi gecersiz. Beklenen format: YYYY-MM-DDTHH:mm' };
  }

  const explicitEnd = input.requestedEnd
    ? parseDateTimeInputInTimeZone(input.requestedEnd, TR_TIME_ZONE)
    : null;
  if (input.requestedEnd && !explicitEnd) {
    return { error: 'Bitis tarihi gecersiz. Beklenen format: YYYY-MM-DDTHH:mm' };
  }

  const range = parseHourMinuteRange(input.requestedRange);
  const followDay = input.leadFollowAt ? toDateOnlyISO(input.leadFollowAt) : null;

  const startFromRange =
    !explicitStart && followDay && range
      ? parseDateTimeInputInTimeZone(`${followDay}T${range.start}`, TR_TIME_ZONE)
      : null;

  const startAt =
    explicitStart ??
    startFromRange ??
    input.leadFollowAt ??
    (() => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const dayKey = toDateOnlyISO(tomorrow) ?? toDateOnlyISO(new Date()) ?? '1970-01-01';
      return (
        parseDateTimeInputInTimeZone(`${dayKey}T09:00`, TR_TIME_ZONE) ??
        new Date(Date.now() + 24 * 60 * 60 * 1000)
      );
    })();

  const endFromRange =
    !explicitEnd && followDay && range
      ? parseDateTimeInputInTimeZone(`${followDay}T${range.end}`, TR_TIME_ZONE)
      : null;

  const endAt = explicitEnd ?? endFromRange ?? new Date(startAt.getTime() + 60 * 60 * 1000);
  if (endAt <= startAt) {
    return { error: 'Randevu bitis zamani baslangictan sonra olmalidir' };
  }

  return { startAt, endAt };
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const parsed = convertLeadToJobSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Gecersiz lead convert-to-job istegi', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const converted = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.findUnique({
        where: { id: params.id },
      });

      if (!lead) {
        return { kind: 'NOT_FOUND' as const };
      }

      const ownerUserId = payload.ownerUserId ?? lead.ownerUserId ?? auth.payload.userId;
      if (ownerUserId) {
        const owner = await tx.user.findUnique({
          where: { id: ownerUserId },
          select: { id: true },
        });
        if (!owner) {
          return { kind: 'INVALID_OWNER' as const };
        }
      }

      const personelId = payload.personelId ?? null;
      if (personelId) {
        const personel = await tx.personel.findFirst({
          where: {
            id: personelId,
            aktif: true,
            deletedAt: null,
          },
          select: { id: true },
        });
        if (!personel) {
          return { kind: 'INVALID_PERSONEL' as const };
        }
      }

      const appointmentWindow = resolveAppointmentWindow({
        requestedStart: payload.baslangicAt,
        requestedEnd: payload.bitisAt,
        requestedRange: payload.tercihSaatAraligi,
        leadFollowAt: lead.takipAt,
      });
      if ('error' in appointmentWindow) {
        return { kind: 'INVALID_APPOINTMENT' as const, error: appointmentWindow.error };
      }

      const overlap = await findAppointmentOverlap(tx, {
        personelId,
        baslangicAt: appointmentWindow.startAt,
        bitisAt: appointmentWindow.endAt,
      });
      if (overlap) {
        return { kind: 'OVERLAP' as const, overlap };
      }

      const boat = await resolveBoatForService(tx, {
        tekneId: payload.tekneId ?? lead.tekneId ?? null,
        tekneAdi: payload.tekneAdi ?? lead.ad ?? `Lead Tekne ${lead.id.slice(-6)}`,
      });

      const job = await tx.service.create({
        data: {
          organizationId: lead.organizationId,
          tekneId: boat.tekneId,
          tekneAdi: boat.tekneAdi,
          adres: payload.adres ?? 'Belirlenecek',
          yer: payload.yer ?? 'YATMARIN',
          servisAciklamasi: payload.servisAciklamasi ?? lead.konu ?? lead.notlar ?? 'Lead conversion ile olustu',
          irtibatKisi: lead.ad,
          telefon: lead.telefon,
          ofisYetkiliId: ownerUserId,
          isTuru: payload.isTuru ?? 'ARIZA',
          durum: toServisDurumu(payload.durum, 'RANDEVU_VERILDI'),
          taseronNotlari: lead.notlar,
        },
      });

      const appointment = await tx.appointment.create({
        data: {
          organizationId: lead.organizationId,
          servisId: job.id,
          personelId,
          baslangicAt: appointmentWindow.startAt,
          bitisAt: appointmentWindow.endAt,
          status: 'PLANLANDI',
          notlar: lead.notlar,
          sira: 0,
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

      if (personelId) {
        await tx.servicePersonel.upsert({
          where: {
            servisId_personelId: {
              servisId: job.id,
              personelId,
            },
          },
          create: {
            servisId: job.id,
            personelId,
            rol: PersonelRol.SORUMLU,
          },
          update: {
            rol: PersonelRol.SORUMLU,
          },
        });
      }

      await syncServiceLegacyPlanningFields(tx, job.id);

      const updatedLead = await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: 'KAZANILDI',
          ownerUserId,
        },
      });

      await writeAuditEvent(tx, {
        organizationId: lead.organizationId,
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.JOB_CREATED,
        entityTipi: 'Job',
        entityId: job.id,
        detay: `Lead conversion ile job olusturuldu: lead=${lead.id}`,
      });

      await writeAuditEvent(tx, {
        organizationId: lead.organizationId,
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.APPOINTMENT_CREATED,
        entityTipi: 'Appointment',
        entityId: appointment.id,
        detay: `Lead conversion ile appointment olusturuldu: job=${job.id}`,
      });

      await writeAuditEvent(tx, {
        organizationId: lead.organizationId,
        userId: auth.payload.userId,
        userEmail: auth.payload.email,
        islemTuru: JOB_AUDIT_EVENTS.LEAD_CONVERTED_TO_JOB,
        entityTipi: 'Lead',
        entityId: lead.id,
        detay: `Lead joba donusturuldu: job=${job.id}`,
      });

      return {
        kind: 'OK' as const,
        lead: updatedLead,
        job,
        appointment,
      };
    });

    if (converted.kind === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Lead bulunamadi' }, { status: 404 });
    }
    if (converted.kind === 'INVALID_OWNER') {
      return NextResponse.json({ error: 'Secilen owner kullanici bulunamadi' }, { status: 400 });
    }
    if (converted.kind === 'INVALID_PERSONEL') {
      return NextResponse.json({ error: 'Secilen personel aktif degil veya bulunamadi' }, { status: 400 });
    }
    if (converted.kind === 'INVALID_APPOINTMENT') {
      return NextResponse.json({ error: converted.error }, { status: 400 });
    }
    if (converted.kind === 'OVERLAP') {
      return NextResponse.json(
        {
          error: 'Secilen teknisyen icin bu saat araliginda cakisan bir randevu var.',
          code: 'APPOINTMENT_OVERLAP',
          conflict: {
            ...converted.overlap,
            baslangicAt: converted.overlap.baslangicAt.toISOString(),
            bitisAt: converted.overlap.bitisAt.toISOString(),
          },
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        lead: {
          ...converted.lead,
          takipAt: converted.lead.takipAt ? converted.lead.takipAt.toISOString() : null,
          createdAt: converted.lead.createdAt.toISOString(),
          updatedAt: converted.lead.updatedAt.toISOString(),
        },
        job: converted.job,
        appointment: mapAppointmentDto(converted.appointment),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/leads/[id]/convert-to-job error:', error);
    return NextResponse.json({ error: 'Lead joba donusturulemedi' }, { status: 500 });
  }
}
