import Link from 'next/link';
import { Prisma, ServisDurumu } from '@prisma/client';
import { CalendarDays, Filter, Ship } from 'lucide-react';
import { MinimumRole } from '@/components/auth/ProtectedComponents';
import { serviceColumns } from '@/components/services/columns';
import { DataTable } from '@/components/services/data-table';
import {
  ACTIVE_STATUS_VALUES,
  DEFAULT_STATUS_FILTERS,
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
import { parseServisFilterStateFromSearchParams } from '@/lib/servisler/filter-url';
import { prisma } from '@/lib/prisma';

type SearchParams = Record<string, string | string[] | undefined>;

function parseViewMode(): DataGridViewMode {
  return 'list';
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
    NOT: {
      durum: {
        in: [ServisDurumu.TAMAMLANDI, ServisDurumu.KESIF_KONTROL],
      },
    },
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
  tahminiBitisTarihi: Date | null;
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
    tahminiBitisTarihi: service.tahminiBitisTarihi ? service.tahminiBitisTarihi.toISOString().slice(0, 10) : null,
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
  const parsedFilterState = parseServisFilterStateFromSearchParams(params);
  const search = parsedFilterState.tekneAdi ?? '';
  const statusRawValues = parsedFilterState.durum ?? [];
  const dateRawValues = parsedFilterState.tarih ?? [];
  const lokasyonRawValues = parsedFilterState.konum ?? [];
  const queueFilter = parsedFilterState.queue ?? 'ALL';

  const parsedStatuses = parseStatusFilters(statusRawValues);
  const dateKeys = parseDateKeys(dateRawValues);
  const enumSet = new Set(Object.values(ServisDurumu));
  const defaultDbStatuses = DEFAULT_STATUS_FILTERS
    .map((status) => normalizeServisDurumuForDb(status))
    .filter((status): status is ServisDurumu => enumSet.has(status as ServisDurumu));
  const activeDbStatuses = ACTIVE_STATUS_VALUES
    .map((status) => normalizeServisDurumuForDb(status))
    .filter((status): status is ServisDurumu => enumSet.has(status as ServisDurumu));
  const effectiveDbStatuses = parsedStatuses.db;
  const inProgressDbStatus = normalizeServisDurumuForDb('DEVAM_EDIYOR') as ServisDurumu;

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
    queueFilter,
    viewMode: parseViewMode(),
    groupBy: parsedFilterState.groupBy ?? 'none',
  };

  const where = buildServiceWhereClause({
    statusFilters: effectiveDbStatuses,
    dateKeys,
  });

  const [services, defaultViewCount, unscheduledByStatusRaw, activeCount, plannedCount, waitingCount, lastSyncLog] = await Promise.all([
    prisma.service.findMany({
      where,
      select: {
        id: true,
        tarih: true,
        tahminiBitisTarihi: true,
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
    }),
    prisma.service.count({
      where: {
        deletedAt: null,
        durum: {
          in: defaultDbStatuses,
        },
      },
    }),
    prisma.service.groupBy({
      by: ['durum'],
      where: {
        deletedAt: null,
        tarih: null,
        durum: {
          in: activeDbStatuses,
        },
      },
      _count: {
        _all: true,
      },
    }),
    prisma.service.count({
      where: { deletedAt: null, durum: inProgressDbStatus },
    }),
    prisma.service.count({
      where: { deletedAt: null, durum: ServisDurumu.RANDEVU_VERILDI },
    }),
    prisma.service.count({
      where: {
        deletedAt: null,
        durum: {
          in: [ServisDurumu.PARCA_BEKLIYOR, ServisDurumu.MUSTERI_ONAY_BEKLIYOR],
        },
      },
    }),
    prisma.syncLog.findFirst({
      orderBy: { createdAt: 'desc' },
      select: {
        status: true,
        createdAt: true,
      },
    }),
  ]);

  const rows = services.map(mapServiceToGridRow);
  const unscheduledByStatus = unscheduledByStatusRaw
    .map((item) => ({
      status: normalizeServisDurumuForApp(item.durum),
      count: item._count._all,
    }))
    .sort((a, b) => b.count - a.count);
  const unscheduledTotal = unscheduledByStatus.reduce((total, item) => total + item.count, 0);
  const syncMinutesAgo = lastSyncLog
    ? Math.floor((Date.now() - new Date(lastSyncLog.createdAt).getTime()) / (1000 * 60))
    : null;
  const syncHealthy = syncMinutesAgo !== null && syncMinutesAgo <= 10;

  const hasAnyInitialFilter =
    Boolean(search) ||
    statusRawValues.length > 0 ||
    selectedLokasyonGroups.length > 0 ||
    dateRawValues.length > 0 ||
    queueFilter !== 'ALL';

  return (
    <div className="container mx-auto space-y-6 px-4 py-6 lg:px-6" data-testid="servisler-page">
      <section className="hero-panel">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <Ship className="h-6 w-6 text-[var(--color-primary-light)]" />
              Servisler
            </h1>
            <p className="page-subtitle mt-1">
              Arama, filtreleme ve durum takibini tek ekranda yonetin
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="chip" data-testid="toplam-kayit-sayisi">
              <CalendarDays className="h-4 w-4" /> Toplam {rows.length} kayıt
            </span>
            <span className="chip" data-testid="varsayilan-gorunum-sayisi">
              Varsayilan gorunumdeki isler: {defaultViewCount}
            </span>
            <span className="chip" data-testid="aktif-isler-sayisi">
              Aktif isler: {activeCount}
            </span>
            <span className="chip" data-testid="planlanan-isler-sayisi">
              Planlanan randevu: {plannedCount}
            </span>
            <span className="chip" data-testid="bekleyen-isler-sayisi">
              Bekleyen isler: {waitingCount}
            </span>
            <span className="chip" data-testid="tarihsiz-isler-sayisi">
              Tarihsiz isler: {unscheduledTotal}
            </span>
            <span className="chip" data-testid="sync-saglik-durumu">
              Sync: {lastSyncLog ? `${lastSyncLog.status} (${syncMinutesAgo} dk once)` : 'Kayıt yok'}{' '}
              {syncHealthy ? '• Saglikli' : '• Gecikmeli'}
            </span>
            <span className="chip">
              <Filter className="h-4 w-4" /> Inline filtreler aktif
            </span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2" data-testid="tarihsiz-durum-ozeti">
          {unscheduledByStatus.length === 0 ? (
            <span className="chip">Tarihsiz kayıt yok</span>
          ) : (
            unscheduledByStatus.map((item) => (
              <Link
                key={item.status}
                href={`/servisler?queue=UNSCHEDULED&durum=${encodeURIComponent(item.status)}`}
                className="chip transition hover:border-[var(--color-primary)]/70 hover:text-[var(--color-primary)]"
                title="Bu duruma ait tarihsiz servisleri filtrele"
              >
                {item.status}: {item.count}
              </Link>
            ))
          )}
        </div>
      </section>

      <div className="flex items-center justify-end">
        <MinimumRole minimumRole="YETKILI">
          <Link href="/servisler/yeni" className="btn btn-primary h-10 px-4 py-2">
            + Yeni Servis
          </Link>
        </MinimumRole>
      </div>

      <details className="surface-panel overflow-hidden" open data-testid="servisler-filtre-detay">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-foreground">
          Filtreler ve Arama
        </summary>
        <div className="space-y-4 border-t border-[var(--color-border)]/60 p-4">
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
      </details>
    </div>
  );
}
