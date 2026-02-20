import { AppointmentStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { parseDateTimeInputInTimeZone, TR_TIME_ZONE } from '@/lib/timezone';
import type { JobAppointment, JobAppointmentStatus } from '@/types/job-appointment';
import { parseDateOnlyToUtcDate } from '@/lib/date-utils';

export const APPOINTMENT_STATUS_VALUES: AppointmentStatus[] = [
  'PLANLANDI',
  'ONAY_BEKLIYOR',
  'ONAYLANDI',
  'YOLDA',
  'VARIS',
  'BASLADI',
  'TAMAMLANDI',
  'IPTAL',
  'ERTELENDI',
];

const appointmentStatusSchema = z.enum([
  'PLANLANDI',
  'ONAY_BEKLIYOR',
  'ONAYLANDI',
  'YOLDA',
  'VARIS',
  'BASLADI',
  'TAMAMLANDI',
  'IPTAL',
  'ERTELENDI',
]);

export const appointmentCreateSchema = z.object({
  baslangicAt: z.string().min(1, 'Baslangic zorunludur'),
  bitisAt: z.string().min(1, 'Bitis zorunludur'),
  personelId: z.string().trim().min(1).nullable().optional(),
  status: appointmentStatusSchema.optional().default('PLANLANDI'),
  notlar: z.string().max(2000).nullable().optional(),
  sira: z.number().int().min(0).optional(),
  kilitli: z.boolean().optional().default(false),
});

export const appointmentUpdateSchema = z.object({
  baslangicAt: z.string().min(1).optional(),
  bitisAt: z.string().min(1).optional(),
  personelId: z.string().trim().min(1).nullable().optional(),
  status: appointmentStatusSchema.optional(),
  notlar: z.string().max(2000).nullable().optional(),
  sira: z.number().int().min(0).optional(),
  kilitli: z.boolean().optional(),
});

export function parseAppointmentDateTime(value: string): Date | null {
  const parsed = parseDateTimeInputInTimeZone(value, TR_TIME_ZONE);
  return parsed;
}

export function normalizeAppointmentStatus(
  value: unknown,
  fallback: AppointmentStatus = 'PLANLANDI'
): AppointmentStatus {
  const parsed = appointmentStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

type AppointmentWithRelations = {
  id: string;
  servisId: string;
  personelId: string | null;
  baslangicAt: Date;
  bitisAt: Date;
  status: AppointmentStatus;
  confirmedAt: Date | null;
  notlar: string | null;
  sira: number;
  kilitli: boolean;
  createdAt: Date;
  updatedAt: Date;
  personel: { ad: string; unvan: string } | null;
  confirmedBy: { email: string } | null;
};

export function mapAppointmentDto(row: AppointmentWithRelations): JobAppointment {
  return {
    id: row.id,
    servisId: row.servisId,
    personelId: row.personelId,
    personelAd: row.personel?.ad ?? null,
    personelUnvan: row.personel?.unvan ?? null,
    baslangicAt: row.baslangicAt.toISOString(),
    bitisAt: row.bitisAt.toISOString(),
    status: row.status as JobAppointmentStatus,
    confirmedAt: row.confirmedAt ? row.confirmedAt.toISOString() : null,
    confirmedByEmail: row.confirmedBy?.email ?? null,
    notlar: row.notlar,
    sira: row.sira,
    kilitli: row.kilitli,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function findAppointmentOverlap(
  tx: Prisma.TransactionClient,
  input: {
    personelId: string | null;
    baslangicAt: Date;
    bitisAt: Date;
    excludeAppointmentId?: string;
  }
) {
  if (!input.personelId) return null;

  return tx.appointment.findFirst({
    where: {
      id: input.excludeAppointmentId ? { not: input.excludeAppointmentId } : undefined,
      deletedAt: null,
      personelId: input.personelId,
      status: {
        notIn: ['IPTAL', 'TAMAMLANDI'],
      },
      baslangicAt: {
        lt: input.bitisAt,
      },
      bitisAt: {
        gt: input.baslangicAt,
      },
    },
    select: {
      id: true,
      servisId: true,
      baslangicAt: true,
      bitisAt: true,
      status: true,
      servis: {
        select: {
          tekneAdi: true,
          servisAciklamasi: true,
        },
      },
    },
  });
}

export async function resolveNextAppointmentOrder(
  tx: Prisma.TransactionClient,
  serviceId: string
): Promise<number> {
  const last = await tx.appointment.findFirst({
    where: {
      servisId: serviceId,
      deletedAt: null,
    },
    orderBy: {
      sira: 'desc',
    },
    select: {
      sira: true,
    },
  });
  return (last?.sira ?? -1) + 1;
}

export async function syncServiceLegacyPlanningFields(
  tx: Prisma.TransactionClient,
  serviceId: string
) {
  const firstAppointment = await tx.appointment.findFirst({
    where: {
      servisId: serviceId,
      deletedAt: null,
      status: {
        notIn: ['IPTAL'],
      },
    },
    orderBy: [{ sira: 'asc' }, { baslangicAt: 'asc' }],
    select: {
      baslangicAt: true,
    },
  });

  if (!firstAppointment) {
    await tx.service.update({
      where: { id: serviceId },
      data: {
        tarih: null,
        saat: null,
      },
    });
    return;
  }

  const localIso = firstAppointment.baslangicAt
    .toLocaleString('sv-SE', { timeZone: TR_TIME_ZONE })
    .replace(' ', 'T')
    .slice(0, 16);

  const [datePart, timePart] = localIso.split('T');
  const dateOnly = parseDateOnlyToUtcDate(datePart);

  await tx.service.update({
    where: { id: serviceId },
    data: {
      tarih: dateOnly,
      saat: timePart ?? null,
    },
  });
}
