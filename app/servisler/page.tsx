import Link from 'next/link';
import { Prisma, ServisDurumu } from '@prisma/client';
import { CalendarDays, Filter } from 'lucide-react';
import { MinimumRole } from '@/components/auth/ProtectedComponents';
import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { serviceColumns } from '@/components/services/columns';
import { DataTable } from '@/components/services/data-table';
import { PageEmptyState } from '@/components/ui/page-states';
import {
  ACTIVE_STATUS_VALUES,
  DEFAULT_STATUS_FILTERS,
  DataGridViewMode,
  PriorityLevel,
  ServiceGridInitialState,
  ServiceGridRow,
  ServiceGridServerPagination,
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

const IN_PROGRESS_DB_STATUS = normalizeServisDurumuForDb('DEVAM_EDIYOR') as ServisDurumu;

function parseViewMode(): DataGridViewMode {
  return 'list';
}

function parsePositiveIntParam(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return parsed;
}

function resolvePageSize(rawLimit: number | null): number {
  const allowed = new Set([10, 25, 50, 100]);
  if (!rawLimit) return 25;
  return allowed.has(rawLimit) ? rawLimit : 25;
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
  search,
  lokasyonGroups,
  dateFrom,
  dateTo,
  technicians,
  blockingReasons,
  statusFilters,
  dateKeys,
}: {
  search: string;
  lokasyonGroups: string[];
  dateFrom?: string;
  dateTo?: string;
  technicians: string[];
  blockingReasons: string[];
  statusFilters: ServisDurumu[];
  dateKeys: string[];
}): Prisma.ServiceWhereInput {
  const andFilters: Prisma.ServiceWhereInput[] = [];
  const where: Prisma.ServiceWhereInput = {
    deletedAt: null,
    NOT: {
      durum: {
        in: [ServisDurumu.TAMAMLANDI, ServisDurumu.KESIF_KONTROL],
      },
    },
  };

  if (statusFilters.length > 0) {
    andFilters.push({ durum: { in: statusFilters } });
  }

  if (search.trim()) {
    andFilters.push({
      OR: [
        { tekneAdi: { contains: search.trim(), mode: 'insensitive' } },
        { servisAciklamasi: { contains: search.trim(), mode: 'insensitive' } },
        { adres: { contains: search.trim(), mode: 'insensitive' } },
      ],
    });
  }

  if (lokasyonGroups.length > 0) {
    andFilters.push({
      OR: lokasyonGroups.map((value) => ({
        OR: [
          { yer: { contains: value, mode: 'insensitive' } },
          { adres: { contains: value, mode: 'insensitive' } },
        ],
      })),
    });
  }

  if (dateKeys.length === 1) {
    const range = createUtcDayRange(dateKeys[0]);
    if (range) {
      andFilters.push({
        tarih: {
          gte: range.start,
          lte: range.end,
        },
      });
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
      andFilters.push({ OR: dateOr });
    }
  }

  if (dateKeys.length === 0 && (dateFrom || dateTo)) {
    const dateRange: Prisma.DateTimeFilter = {};
    if (dateFrom) {
      const fromRange = createUtcDayRange(dateFrom);
      if (fromRange) dateRange.gte = fromRange.start;
    }
    if (dateTo) {
      const toRange = createUtcDayRange(dateTo);
      if (toRange) dateRange.lte = toRange.end;
    }
    if (dateRange.gte || dateRange.lte) {
      andFilters.push({ tarih: dateRange });
    }
  }

  if (technicians.length > 0) {
    andFilters.push({
      personeller: {
        some: {
          personel: {
            ad: {
              in: technicians,
            },
          },
        },
      },
    });
  }

  if (blockingReasons.length > 0) {
    andFilters.push({
      OR: blockingReasons.map((reason) => ({
        taseronNotlari: {
          contains: reason,
          mode: 'insensitive',
        },
      })),
    });
  }

  if (andFilters.length > 0) {
    where.AND = andFilters;
  }

  return where;
}

function resolvePriority(service: {
  durum: ServisDurumu;
  tarih: Date | null;
  tahminiBitisTarihi: Date | null;
}): PriorityLevel {
  const dueDate = service.tahminiBitisTarihi ?? service.tarih;
  const now = Date.now();
  const dueTime = dueDate ? dueDate.getTime() : null;
  const isOverdue = dueTime !== null && dueTime < now;
  if (isOverdue) return 'YUKSEK';
  if (service.durum === ServisDurumu.PARCA_BEKLIYOR || service.durum === ServisDurumu.MUSTERI_ONAY_BEKLIYOR) {
    return 'YUKSEK';
  }
  if (service.durum === IN_PROGRESS_DB_STATUS || service.durum === ServisDurumu.RANDEVU_VERILDI) {
    return 'ORTA';
  }
  return 'DUSUK';
}

function resolveBlockingReason(service: {
  durum: ServisDurumu;
  taseronNotlari: string | null;
}): string | null {
  const note = service.taseronNotlari?.trim() ?? '';
  if (note.toUpperCase().startsWith('BLOKAJ:')) {
    const line = note.split('\n')[0] ?? '';
    return line.replace(/^BLOKAJ:\s*/i, '').trim() || null;
  }

  if (service.durum === ServisDurumu.PARCA_BEKLIYOR) return 'Parca Bekliyor';
  if (service.durum === ServisDurumu.MUSTERI_ONAY_BEKLIYOR) return 'Onay Bekliyor';
  if (service.durum === ServisDurumu.RAPOR_BEKLIYOR) return 'Rapor Bekliyor';
  if (service.durum === ServisDurumu.ERTELENDI) return 'Ertelendi';
  return null;
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
  taseronNotlari: string | null;
  createdAt: Date;
  personeller: Array<{
    personel: {
      ad: string;
    };
  }>;
  _count: {
    personeller: number;
  };
}): ServiceGridRow {
  const tarihKey = service.tarih ? service.tarih.toISOString().slice(0, 10) : '';
  const atananTeknisyenler = service.personeller
    .map((item) => item.personel.ad.trim())
    .filter(Boolean);

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
    oncelik: resolvePriority(service),
    blokajNedeni: resolveBlockingReason(service),
    atananTeknisyenler,
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
  const requestedPage = parsePositiveIntParam(params.page) ?? 1;
  const pageSize = resolvePageSize(parsePositiveIntParam(params.limit));
  const parsedFilterState = parseServisFilterStateFromSearchParams(params);
  const search = parsedFilterState.tekneAdi ?? '';
  const statusRawValues = parsedFilterState.durum ?? [];
  const dateRawValues = parsedFilterState.tarih ?? [];
  const lokasyonRawValues = parsedFilterState.konum ?? [];
  const dateFrom = parsedFilterState.dateFrom ?? '';
  const dateTo = parsedFilterState.dateTo ?? '';
  const technicians = parsedFilterState.teknisyen ?? [];
  const priorities = (parsedFilterState.oncelik ?? []).filter(
    (value): value is PriorityLevel => value === 'YUKSEK' || value === 'ORTA' || value === 'DUSUK'
  );
  const blockingReasons = parsedFilterState.blokaj ?? [];
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
  const inProgressDbStatus = IN_PROGRESS_DB_STATUS;

  const selectedLokasyonGroups = Array.from(
    new Set(
      lokasyonRawValues
        .map((value) => value.trim())
        .filter(Boolean)
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
    dateFrom,
    dateTo,
    technicians,
    priorities,
    blockingReasons,
  };

  const where = buildServiceWhereClause({
    search,
    lokasyonGroups: selectedLokasyonGroups,
    dateFrom,
    dateTo,
    technicians,
    blockingReasons,
    statusFilters: effectiveDbStatuses,
    dateKeys,
  });

  const filteredTotalCount = await prisma.service.count({ where });
  const totalPages = Math.max(1, Math.ceil(filteredTotalCount / pageSize));
  const currentPage = Math.min(requestedPage, totalPages);
  const skip = (currentPage - 1) * pageSize;

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
        taseronNotlari: true,
        createdAt: true,
        personeller: {
          select: {
            personel: {
              select: {
                ad: true,
              },
            },
          },
        },
        _count: {
          select: {
            personeller: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { tarih: 'desc' }],
      skip,
      take: pageSize,
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
  const serverPagination: ServiceGridServerPagination = {
    page: currentPage,
    limit: pageSize,
    total: filteredTotalCount,
    totalPages,
  };
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
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    technicians.length > 0 ||
    priorities.length > 0 ||
    blockingReasons.length > 0 ||
    queueFilter !== 'ALL';

  return (
    <PageContent data-testid="servisler-page">
      <PageHeader
        title="Is Emirleri"
        description="Arama, filtre ve durum yonetimi"
        breadcrumbs={[
          { label: 'Operasyon', href: '/' },
          { label: 'Is Emirleri' },
        ]}
        rightActions={
          <MinimumRole minimumRole="YETKILI">
            <Link href="/servisler/yeni" className="btn btn-primary h-10 px-4 py-2">
              + Yeni Servis
            </Link>
          </MinimumRole>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="chip" data-testid="toplam-kayit-sayisi">
              <CalendarDays className="h-4 w-4" /> Toplam {serverPagination.total} kayıt
            </span>
            <span className="chip" data-testid="sayfa-kayit-sayisi">
              Bu sayfa: {rows.length} kayıt (Sayfa {serverPagination.page}/{serverPagination.totalPages})
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
            <span
              className="chip"
              data-testid="sync-saglik-durumu"
              title="Son senkron sonucunu ve dakikaya gore gecikme bilgisini gosterir"
            >
              Sync: {lastSyncLog ? `${lastSyncLog.status} (${syncMinutesAgo} dk once)` : 'Kayıt yok'}{' '}
              {syncHealthy ? '• Saglikli' : '• Gecikmeli'}
            </span>
            <span className="chip" title="Ek filtreler icin Filtreler panelini acin">
              <Filter className="h-4 w-4" /> Hizli filtreler aktif
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2" data-testid="tarihsiz-durum-ozeti">
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
        </div>
      </PageHeader>

      <section className="surface-panel overflow-hidden" data-testid="servisler-filtre-detay">
        <div className="space-y-4 p-4">
          {rows.length === 0 ? (
            <PageEmptyState
              title={hasAnyInitialFilter ? 'Filtreye uygun is emri bulunamadi' : 'Henuz is emri bulunmuyor'}
              description={hasAnyInitialFilter ? 'Filtreleri temizleyip tekrar deneyin.' : 'Ilk kaydi ekleyerek baslayin.'}
              action={
                <>
                  {hasAnyInitialFilter ? (
                    <Link href="/servisler" className="btn btn-secondary h-9 px-4 py-2">
                      Filtreleri Temizle
                    </Link>
                  ) : null}
                  <MinimumRole minimumRole="YETKILI">
                    <Link href="/servisler/yeni" className="btn btn-primary h-9 px-4 py-2">
                      + Yeni Is Emri
                    </Link>
                  </MinimumRole>
                </>
              }
            />
          ) : (
            <DataTable
              columns={serviceColumns}
              data={rows}
              initialState={initialState}
              serverPagination={serverPagination}
            />
          )}
        </div>
      </section>
    </PageContent>
  );
}
