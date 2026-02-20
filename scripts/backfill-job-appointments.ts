import { AppointmentStatus, PersonelRol, PrismaClient, ServisDurumu } from '@prisma/client';
import { parseDateTimeInputInTimeZone, TR_TIME_ZONE } from '../lib/timezone';

type CliOptions = {
  dryRun: boolean;
  limit: number | null;
  durationMinutes: number;
  defaultStart: string;
};

type CandidateService = {
  id: string;
  tekneAdi: string;
  tarih: Date | null;
  saat: string | null;
  durum: ServisDurumu;
  personeller: Array<{
    personelId: string;
    rol: PersonelRol;
  }>;
};

const DEFAULT_OPTIONS: CliOptions = {
  dryRun: false,
  limit: null,
  durationMinutes: 120,
  defaultStart: '09:00',
};

function parseArgs(argv: string[]): CliOptions {
  const next = { ...DEFAULT_OPTIONS };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      next.dryRun = true;
      continue;
    }
    if (arg.startsWith('--limit=')) {
      const parsed = Number.parseInt(arg.slice('--limit='.length), 10);
      next.limit = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      continue;
    }
    if (arg.startsWith('--duration=')) {
      const parsed = Number.parseInt(arg.slice('--duration='.length), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        next.durationMinutes = parsed;
      }
      continue;
    }
    if (arg.startsWith('--default-start=')) {
      const value = arg.slice('--default-start='.length);
      if (/^\d{2}:\d{2}$/.test(value)) {
        next.defaultStart = value;
      }
    }
  }

  return next;
}

function mapServiceStatusToAppointmentStatus(durum: ServisDurumu): AppointmentStatus {
  switch (durum) {
    case ServisDurumu.MUSTERI_ONAY_BEKLIYOR:
      return 'ONAY_BEKLIYOR';
    case 'DEVAM_EDİYOR':
      return 'BASLADI';
    case ServisDurumu.TAMAMLANDI:
      return 'TAMAMLANDI';
    case ServisDurumu.IPTAL:
      return 'IPTAL';
    case ServisDurumu.ERTELENDI:
      return 'ERTELENDI';
    default:
      return 'PLANLANDI';
  }
}

function toBackfillStartAt(service: CandidateService, defaultStart: string): Date | null {
  if (!service.tarih) return null;
  const dateKey = service.tarih.toISOString().slice(0, 10);
  const timeKey = service.saat && /^\d{2}:\d{2}$/.test(service.saat) ? service.saat : defaultStart;
  return parseDateTimeInputInTimeZone(`${dateKey}T${timeKey}`, TR_TIME_ZONE);
}

function resolvePrimaryPersonelId(service: CandidateService): string | null {
  const sorumlu = service.personeller.find((assignment) => assignment.rol === 'SORUMLU');
  if (sorumlu) return sorumlu.personelId;
  return service.personeller[0]?.personelId ?? null;
}

function buildBackfillNote(service: CandidateService): string {
  const saat = service.saat && service.saat.trim() ? service.saat : '09:00 (default)';
  return `Legacy backfill: Service.tarih/saat (${service.tarih?.toISOString().slice(0, 10)} ${saat}) alanindan olusturuldu.`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  console.log(
    `[jobs:backfill-appointments] mode=${options.dryRun ? 'dry-run' : 'apply'} timezone=${TR_TIME_ZONE} duration=${options.durationMinutes}m limit=${options.limit ?? 'all'}`
  );

  const candidates = await prisma.service.findMany({
    where: {
      deletedAt: null,
      tarih: { not: null },
      appointments: {
        none: {
          deletedAt: null,
        },
      },
    },
    orderBy: [{ createdAt: 'asc' }],
    take: options.limit ?? undefined,
    select: {
      id: true,
      tekneAdi: true,
      tarih: true,
      saat: true,
      durum: true,
      personeller: {
        select: {
          personelId: true,
          rol: true,
        },
        orderBy: [{ rol: 'desc' }],
      },
    },
  });

  let created = 0;
  let skippedInvalidDate = 0;
  let skippedRace = 0;
  let failed = 0;

  for (const service of candidates) {
    const startAt = toBackfillStartAt(service, options.defaultStart);
    if (!startAt) {
      skippedInvalidDate += 1;
      continue;
    }

    const endAt = new Date(startAt.getTime() + options.durationMinutes * 60_000);
    const personelId = resolvePrimaryPersonelId(service);
    const status = mapServiceStatusToAppointmentStatus(service.durum);

    if (options.dryRun) {
      console.log(
        `DRY  job=${service.id} boat="${service.tekneAdi}" start=${startAt.toISOString()} end=${endAt.toISOString()} personel=${personelId ?? '-'} status=${status}`
      );
      created += 1;
      continue;
    }

    try {
      const inserted = await prisma.$transaction(async (tx) => {
        const hasAppointment = await tx.appointment.findFirst({
          where: {
            servisId: service.id,
            deletedAt: null,
          },
          select: { id: true },
        });

        if (hasAppointment) {
          return null;
        }

        return tx.appointment.create({
          data: {
            servisId: service.id,
            personelId,
            baslangicAt: startAt,
            bitisAt: endAt,
            status,
            sira: 0,
            notlar: buildBackfillNote(service),
            kilitli: false,
          },
          select: { id: true },
        });
      });

      if (!inserted) {
        skippedRace += 1;
        continue;
      }

      created += 1;
      console.log(`OK   job=${service.id} appointment=${inserted.id}`);
    } catch (error) {
      failed += 1;
      console.error(`ERR  job=${service.id} ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(
    `[jobs:backfill-appointments] scanned=${candidates.length} created=${created} skippedInvalidDate=${skippedInvalidDate} skippedRace=${skippedRace} failed=${failed}`
  );

  await prisma.$disconnect();

  if (failed > 0) {
    process.exitCode = 1;
  }
}

void main();
