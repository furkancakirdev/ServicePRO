import Link from 'next/link';
import { Prisma, ServisDurumu } from '@prisma/client';
import { CalendarDays, Filter, Ship } from 'lucide-react';
import { MinimumRole } from '@/components/auth/ProtectedComponents';
import { serviceColumns } from '@/components/services/columns';
import { DataTable } from '@/components/services/data-table';
import {
  DEFAULT_STATUS_FILTERS,
  DataGridGroupBy,
  DataGridViewMode,
  LOKASYON_FILTER_OPTIONS,
  ServiceGridInitialState,
  ServiceGridRow,
} from '@/components/services/types';
import { createUtcDayRange, parseDateOnlyToUtcDate } from '@/lib/date-utils';
import {
  getLokasyonGroupFromFields,
  normalizeServisDurumuForApp,
  normalizeServisDurumuForDb,
} from '@/lib/domain-mappers';
import { prisma } from '@/lib/prisma';

type SearchParams = Record<string, string | string[] | undefined>;

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function splitCommaValues(values: string[]): string[] {
  return values
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseViewMode(value: string | undefined): DataGridViewMode {
  return value === 'board' ? 'board' : 'list';
}

function parseGroupBy(value: string | undefined): DataGridGroupBy {
  if (value === 'tekneAdi' || value === 'lokasyonGroup') return value;
  return 'none';
}

function parseDateKeys(rawValues: string[]): string[] {
  const normalized = rawValues
    .map((value) => {
      const parsed = parseDateOnlyToUtcDate(value);
      return parsed ? parsed.toISOString().slice(0, 10) : null;
    })
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(normalized));
}

function parseStatusFilters(rawValues: string[]): { db: ServisDurumu[]; app: string[] } {
  const enumSet = new Set(Object.values(ServisDurumu));

  const appStatuses = Array.from(
    new Set(
      rawValues
        .map((value) => normalizeServisDurumuForApp(value))
        .filter(Boolean)
    )
  );

  const dbStatuses = rawValues
    .map((value) => normalizeServisDurumuForDb(value))
    .filter((value): value is ServisDurumu => enumSet.has(value as ServisDurumu));

  return {
    db: Array.from(new Set(dbStatuses)),
    app: appStatuses,
  };
}

function buildServiceWhereClause({
  statusFilters,
  dateKeys,
}: {
  statusFilters: ServisDurumu[];
  dateKeys: string[];
}): Prisma.ServiceWhereInput {
  const where: Prisma.ServiceWhereInput = {
    deletedAt: null,
  };

  if (statusFilters.length > 0) {
    where.durum = { in: statusFilters };
  }

  if (dateKeys.length === 1) {
    const range = createUtcDayRange(dateKeys[0]);
    if (range) {
      where.tarih = {
        gte: range.start,
        lte: range.end,
      };
    }
  } else if (dateKeys.length > 1) {
    const dateOr: Prisma.ServiceWhereInput[] = [];

    for (const dateKey of dateKeys) {
      const range = createUtcDayRange(dateKey);
      if (!range) continue;
      dateOr.push({
        tarih: {
          gte: range.start,
          lte: range.end,
        },
      });
    }

    if (dateOr.length > 0) {
      where.OR = dateOr;
    }
  }

  return where;
}

function mapServiceToGridRow(service: {
  id: string;
  tarih: Date | null;
  saat: string | null;
  tekneAdi: string;
  adres: string;
  yer: string;
  servisAciklamasi: string;
  irtibatKisi: string | null;
  telefon: string | null;
  durum: ServisDurumu;
  isTuru: string;
  createdAt: Date;
  _count: {
    personeller: number;
  };
}): ServiceGridRow {
  const tarihKey = service.tarih ? service.tarih.toISOString().slice(0, 10) : '';

  return {
    id: service.id,
    tarih: tarihKey || null,
    tarihKey,
    saat: service.saat,
    tekneAdi: service.tekneAdi,
    adres: service.adres,
    yer: service.yer,
    lokasyonGroup: getLokasyonGroupFromFields(service.yer, service.adres),
    servisAciklamasi: service.servisAciklamasi,
    irtibatKisi: service.irtibatKisi,
    telefon: service.telefon,
    durum: normalizeServisDurumuForApp(service.durum),
    personelSayisi: service._count.personeller,
    isTuru: service.isTuru,
    createdAt: service.createdAt.toISOString(),
  };
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = searchParams ?? {};
  const search = (params.search ?? params.arama ?? '').toString().trim();

  const statusRawValues = splitCommaValues(toArray(params.durum));
  const dateRawValues = splitCommaValues([...toArray(params.date), ...toArray(params.tarih)]);
  const lokasyonRawValues = splitCommaValues(toArray(params.adresGroup));

  const parsedStatuses = parseStatusFilters(statusRawValues);
  const dateKeys = parseDateKeys(dateRawValues);

  const selectedLokasyonGroups = Array.from(
    new Set(
      lokasyonRawValues
        .map((value) => value.toUpperCase())
        .filter((value): value is ServiceGridRow['lokasyonGroup'] =>
          LOKASYON_FILTER_OPTIONS.some((option) => option.value === value)
        )
    )
  );

  const initialState: ServiceGridInitialState = {
    search,
    statuses: parsedStatuses.app.length > 0 ? parsedStatuses.app : [...DEFAULT_STATUS_FILTERS],
    lokasyonGroups: selectedLokasyonGroups,
    dateKeys,
    viewMode: parseViewMode(typeof params.view === 'string' ? params.view : undefined),
    groupBy: parseGroupBy(typeof params.groupBy === 'string' ? params.groupBy : undefined),
  };

  const where = buildServiceWhereClause({
    statusFilters: parsedStatuses.db,
    dateKeys,
  });

  const services = await prisma.service.findMany({
    where,
    select: {
      id: true,
      tarih: true,
      saat: true,
      tekneAdi: true,
      adres: true,
      yer: true,
      servisAciklamasi: true,
      irtibatKisi: true,
      telefon: true,
      durum: true,
      isTuru: true,
      createdAt: true,
      _count: {
        select: {
          personeller: true,
        },
      },
    },
    orderBy: [{ tarih: 'desc' }, { createdAt: 'desc' }],
    take: 2500,
  });

  const rows = services.map(mapServiceToGridRow);

  const hasAnyInitialFilter =
    Boolean(search) ||
    statusRawValues.length > 0 ||
    selectedLokasyonGroups.length > 0 ||
    dateRawValues.length > 0;

  return (
    <div className="container mx-auto space-y-6 py-8">
      <section className="hero-panel">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <Ship className="h-6 w-6 text-[var(--color-primary-light)]" />
              Servisler
            </h1>
            <p className="page-subtitle mt-1">
              TanStack Data Grid ile gelişmiş filtreleme, gruplama ve board görünümü
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="chip">
              <CalendarDays className="h-4 w-4" /> Toplam {rows.length} kayıt
            </span>
            <span className="chip">
              <Filter className="h-4 w-4" /> Faceted filtreler aktif
            </span>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end">
        <MinimumRole minimumRole="YETKILI">
          <Link href="/servisler/yeni" className="btn btn-primary h-10 px-4 py-2">
            + Yeni Servis
          </Link>
        </MinimumRole>
      </div>

      <div className="surface-panel p-4">
        {rows.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--color-border)]/70 bg-[var(--color-surface)]/20 p-8 text-center">
            <p className="text-base font-semibold text-foreground">
              {hasAnyInitialFilter ? 'Filtrelere uygun kayıt bulunamadı' : 'Henüz servis kaydı yok'}
            </p>
            <p className="text-sm text-muted-foreground">
              {hasAnyInitialFilter
                ? 'Filtreleri temizleyip tekrar deneyin.'
                : 'İlk servis kaydınızı oluşturarak başlayın.'}
            </p>
            <div className="flex items-center gap-2">
              {hasAnyInitialFilter && (
                <Link href="/servisler" className="btn btn-secondary h-9 px-4 py-2">
                  Filtreleri Temizle
                </Link>
              )}
              <MinimumRole minimumRole="YETKILI">
                <Link href="/servisler/yeni" className="btn btn-primary h-9 px-4 py-2">
                  + Yeni Servis
                </Link>
              </MinimumRole>
            </div>
          </div>
        ) : (
          <DataTable columns={serviceColumns} data={rows} initialState={initialState} />
        )}
      </div>
    </div>
  );
}
