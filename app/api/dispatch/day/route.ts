import { NextResponse } from 'next/server';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { requireAuth } from '@/lib/auth/api-auth';
import { prisma } from '@/lib/prisma';
import { createUtcDayRange, toDateOnlyISO } from '@/lib/date-utils';
import { mapAppointmentDto } from '@/lib/jobs/appointments';
import { TR_TIME_ZONE } from '@/lib/timezone';

function resolveDateKey(input: string | null): string {
  if (input) return input;
  return toDateOnlyISO(new Date()) ?? '';
}

const APPOINTMENT_STATUSES = new Set<AppointmentStatus>([
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

function parseStatusFilter(searchParams: URLSearchParams): AppointmentStatus[] {
  const raw = searchParams
    .getAll('durum')
    .flatMap((item) => item.split(','))
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

  const values = raw.filter((item): item is AppointmentStatus => APPOINTMENT_STATUSES.has(item as AppointmentStatus));
  return Array.from(new Set(values));
}

function normalizeConfirmedFilter(value: string | null): 'all' | 'confirmed' | 'unconfirmed' {
  const normalized = String(value ?? 'all').trim().toLowerCase();
  if (normalized === 'confirmed') return 'confirmed';
  if (normalized === 'unconfirmed') return 'unconfirmed';
  return 'all';
}

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request, ['ADMIN', 'YETKILI']);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const date = resolveDateKey(searchParams.get('date'));
    const range = createUtcDayRange(date);
    const statusFilter = parseStatusFilter(searchParams);
    const confirmedFilter = normalizeConfirmedFilter(searchParams.get('confirmed'));
    const locationFilter = searchParams.get('konum')?.trim() ?? '';
    const personelFilter = searchParams.get('personelId')?.trim() ?? '';

    if (!range) {
      return NextResponse.json({ error: 'Gecersiz tarih parametresi' }, { status: 400 });
    }

    const where: Prisma.AppointmentWhereInput = {
      deletedAt: null,
      baslangicAt: {
        gte: range.start,
        lte: range.end,
      },
      ...(statusFilter.length > 0 ? { status: { in: statusFilter } } : {}),
      ...(confirmedFilter === 'confirmed' ? { confirmedAt: { not: null } } : {}),
      ...(confirmedFilter === 'unconfirmed' ? { confirmedAt: null } : {}),
      ...(personelFilter && personelFilter !== 'ALL' ? { personelId: personelFilter } : {}),
      ...(locationFilter && locationFilter !== 'ALL'
        ? {
            servis: {
              OR: [
                {
                  yer: {
                    contains: locationFilter,
                    mode: 'insensitive',
                  },
                },
                {
                  adres: {
                    contains: locationFilter,
                    mode: 'insensitive',
                  },
                },
              ],
            },
          }
        : {}),
    };

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: [{ baslangicAt: 'asc' }, { sira: 'asc' }],
      include: {
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
      },
    });

    return NextResponse.json({
      date,
      timezone: TR_TIME_ZONE,
      filters: {
        durum: statusFilter,
        confirmed: confirmedFilter,
        konum: locationFilter || null,
        personelId: personelFilter || null,
      },
      appointments: appointments.map((item) => ({
        ...mapAppointmentDto(item),
        job: item.servis,
      })),
      unassigned: appointments.filter((item) => !item.personelId).map((item) => item.id),
    });
  } catch (error) {
    console.error('GET /api/dispatch/day error:', error);
    return NextResponse.json({ error: 'Dispatch day verisi getirilemedi' }, { status: 500 });
  }
}
