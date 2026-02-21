import Link from 'next/link';
import { Prisma, ServisDurumu } from '@prisma/client';
import { Anchor, Search } from 'lucide-react';
import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { PageEmptyState } from '@/components/ui/page-states';
import { formatDateDdmmyyyShortMonth } from '@/lib/date-utils';
import { getLokasyonGroupFromFields } from '@/lib/domain-mappers';
import { prisma } from '@/lib/prisma';

type SearchParams = Record<string, string | string[] | undefined>;

const PAGE_SIZE = 20;
const CLOSED_STATUSES: ServisDurumu[] = [ServisDurumu.TAMAMLANDI, ServisDurumu.IPTAL];
type LocationFilter = 'ALL' | 'YATMARIN' | 'NETSEL' | 'DIS_SERVIS';

function asString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function parsePage(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

function parseLocationFilter(value: string): LocationFilter {
  const normalized = value.trim().toLocaleUpperCase('tr-TR');
  if (normalized === 'YATMARIN') return 'YATMARIN';
  if (normalized === 'NETSEL') return 'NETSEL';
  if (normalized === 'DIS_SERVIS') return 'DIS_SERVIS';
  return 'ALL';
}

function locationWhereClause(filter: LocationFilter): Prisma.TekneWhereInput | null {
  if (filter === 'ALL') return null;
  if (filter === 'YATMARIN') {
    return {
      adres: { contains: 'yatmarin', mode: 'insensitive' },
    };
  }
  if (filter === 'NETSEL') {
    return {
      adres: { contains: 'netsel', mode: 'insensitive' },
    };
  }
  return {
    NOT: {
      OR: [
        { adres: { contains: 'yatmarin', mode: 'insensitive' } },
        { adres: { contains: 'netsel', mode: 'insensitive' } },
      ],
    },
  };
}

function locationLabel(value: string): string {
  const normalized = getLokasyonGroupFromFields(value, value);
  if (normalized === 'YATMARIN') return 'Yatmarin';
  if (normalized === 'NETSEL') return 'Netsel';
  return 'Dış Servis';
}

export default async function BoatsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = searchParams ?? {};
  const query = asString(params.q).trim();
  const page = parsePage(asString(params.page));
  const locationFilter = parseLocationFilter(asString(params.konum));

  const where: Prisma.TekneWhereInput = {
    aktif: true,
    deletedAt: null,
  };

  if (query) {
    where.OR = [
      { ad: { contains: query, mode: 'insensitive' } },
      { marka: { contains: query, mode: 'insensitive' } },
      { model: { contains: query, mode: 'insensitive' } },
      { seriNo: { contains: query, mode: 'insensitive' } },
      { adres: { contains: query, mode: 'insensitive' } },
    ];
  }

  const locationWhere = locationWhereClause(locationFilter);
  if (locationWhere) {
    where.AND = [...(Array.isArray(where.AND) ? where.AND : []), locationWhere];
  }

  const [total, boats] = await Promise.all([
    prisma.tekne.count({ where }),
    prisma.tekne.findMany({
      where,
      orderBy: { ad: 'asc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        ad: true,
        adres: true,
        marka: true,
        model: true,
        seriNo: true,
        servisler: {
          where: { deletedAt: null },
          orderBy: [{ tarih: 'desc' }, { createdAt: 'desc' }],
          take: 1,
          select: {
            tarih: true,
            yer: true,
            adres: true,
          },
        },
      },
    }),
  ]);

  const boatIds = boats.map((boat) => boat.id);
  const openCountsRaw =
    boatIds.length > 0
      ? await prisma.service.groupBy({
          by: ['tekneId'],
          where: {
            deletedAt: null,
            tekneId: { in: boatIds },
            durum: { notIn: CLOSED_STATUSES },
          },
          _count: { _all: true },
        })
      : [];

  const openCountMap = new Map(openCountsRaw.map((row) => [row.tekneId, row._count._all]));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const baseQuery = new URLSearchParams();
  if (query) baseQuery.set('q', query);
  if (locationFilter !== 'ALL') baseQuery.set('konum', locationFilter);

  const prevQuery = new URLSearchParams(baseQuery);
  prevQuery.set('page', String(Math.max(1, page - 1)));
  const nextQuery = new URLSearchParams(baseQuery);
  nextQuery.set('page', String(Math.min(totalPages, page + 1)));

  return (
    <PageContent data-testid="tekneler-page">
      <PageHeader
        title="Tekneler"
        description="Tekne profilleri, açık işler ve servis geçmişi"
        breadcrumbs={[
          { label: 'Operasyon', href: '/' },
          { label: 'Tekneler' },
        ]}
        rightActions={
          <Link href="/is-emirleri/yeni" className="btn btn-primary h-10 px-4 py-2">
            + Yeni İş Emri
          </Link>
        }
      />

      <section className="surface-panel space-y-4 p-4">
        <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]" method="get">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Tekne, marka, model veya seri no ara"
              className="form-input w-full pl-8"
            />
          </label>

          <select name="konum" defaultValue={locationFilter} className="form-select w-full">
            <option value="ALL">Tüm Lokasyonlar</option>
            <option value="YATMARIN">Yatmarin</option>
            <option value="NETSEL">Netsel</option>
            <option value="DIS_SERVIS">Dış Servis</option>
          </select>

          <button type="submit" className="btn btn-secondary h-10 px-4 py-2">
            Filtrele
          </button>
        </form>

        {boats.length === 0 ? (
          <PageEmptyState
            title={query ? 'Aramaya uygun tekne bulunamadı' : 'Aktif tekne kaydı bulunamadı'}
            description="Filtreleri temizleyip tekrar deneyebilirsiniz."
            action={
              <Link href="/tekneler" className="btn btn-secondary h-9 px-4 py-2">
                Filtreleri Temizle
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-3">Tekne Adı</th>
                  <th className="px-3 py-3">Lokasyon</th>
                  <th className="px-3 py-3">Son Servis</th>
                  <th className="px-3 py-3">Açık İş Sayısı</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {boats.map((boat) => {
                  const lastService = boat.servisler[0];
                  const locationValue = lastService?.yer || lastService?.adres || boat.adres || '';
                  const locationText = locationValue ? locationLabel(locationValue) : '-';
                  return (
                    <tr
                      key={boat.id}
                      className="border-b border-border/60 text-sm text-foreground last:border-b-0"
                      data-testid={`tekne-row-${boat.id}`}
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Anchor className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{boat.ad}</p>
                            <p className="text-xs text-muted-foreground">
                              {[boat.marka, boat.model].filter(Boolean).join(' ')}{' '}
                              {boat.seriNo ? `• SN: ${boat.seriNo}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">{locationText}</td>
                      <td className="px-3 py-3">
                        {lastService?.tarih ? formatDateDdmmyyyShortMonth(lastService.tarih) : '-'}
                      </td>
                      <td className="px-3 py-3">
                        <span className="chip">{openCountMap.get(boat.id) ?? 0}</span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/tekneler/${boat.id}`}
                          className="btn btn-secondary h-8 px-3 py-1 text-xs"
                          data-testid={`tekne-open-profile-${boat.id}`}
                        >
                          Profili Aç
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-muted-foreground">
            Toplam {total} kayıt • Sayfa {page} / {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={`/tekneler?${prevQuery.toString()}`}
              className={`btn btn-secondary h-9 px-3 py-2 ${page <= 1 ? 'pointer-events-none opacity-60' : ''}`}
            >
              Önceki
            </Link>
            <Link
              href={`/tekneler?${nextQuery.toString()}`}
              className={`btn btn-secondary h-9 px-3 py-2 ${page >= totalPages ? 'pointer-events-none opacity-60' : ''}`}
            >
              Sonraki
            </Link>
          </div>
        </div>
      </section>
    </PageContent>
  );
}
