import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ServisDurumu } from '@prisma/client';
import { CalendarDays, History, Wrench } from 'lucide-react';
import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { PageEmptyState } from '@/components/ui/page-states';
import { getStatusConfig } from '@/lib/config/status-config';
import { formatDateDdmmyyyShortMonth } from '@/lib/date-utils';
import { getLokasyonGroupFromFields } from '@/lib/domain-mappers';
import { prisma } from '@/lib/prisma';
import { cn } from '@/lib/utils';

type SearchParams = Record<string, string | string[] | undefined>;

const HISTORY_PAGE_SIZE = 12;
const CLOSED_STATUSES: ServisDurumu[] = [ServisDurumu.TAMAMLANDI, ServisDurumu.IPTAL];

function asString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function parsePage(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

function locationLabel(value: string): string {
  const normalized = getLokasyonGroupFromFields(value, value);
  if (normalized === 'YATMARIN') return 'Yatmarin';
  if (normalized === 'NETSEL') return 'Netsel';
  return 'D?? Servis';
}

export default async function BoatProfilePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: SearchParams;
}) {
  const historyPage = parsePage(asString(searchParams?.page));

  const tekne = await prisma.tekne.findFirst({
    where: {
      id: params.id,
      deletedAt: null,
    },
    select: {
      id: true,
      ad: true,
      marka: true,
      model: true,
      seriNo: true,
      adres: true,
      telefon: true,
      email: true,
      aciklama: true,
      aktif: true,
    },
  });

  if (!tekne) {
    notFound();
  }

  const [latestService, openCount, totalCount, openServices, historyCount, historyServices] =
    await Promise.all([
      prisma.service.findFirst({
        where: { tekneId: tekne.id, deletedAt: null },
        orderBy: [{ tarih: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          tarih: true,
          saat: true,
          yer: true,
          adres: true,
          servisAciklamasi: true,
          durum: true,
        },
      }),
      prisma.service.count({
        where: {
          tekneId: tekne.id,
          deletedAt: null,
          durum: { notIn: CLOSED_STATUSES },
        },
      }),
      prisma.service.count({
        where: {
          tekneId: tekne.id,
          deletedAt: null,
        },
      }),
      prisma.service.findMany({
        where: {
          tekneId: tekne.id,
          deletedAt: null,
          durum: { notIn: CLOSED_STATUSES },
        },
        orderBy: [{ tarih: 'desc' }, { createdAt: 'desc' }],
        take: 8,
        select: {
          id: true,
          tarih: true,
          saat: true,
          yer: true,
          adres: true,
          servisAciklamasi: true,
          durum: true,
        },
      }),
      prisma.service.count({
        where: { tekneId: tekne.id, deletedAt: null },
      }),
      prisma.service.findMany({
        where: { tekneId: tekne.id, deletedAt: null },
        orderBy: [{ tarih: 'desc' }, { createdAt: 'desc' }],
        skip: (historyPage - 1) * HISTORY_PAGE_SIZE,
        take: HISTORY_PAGE_SIZE,
        select: {
          id: true,
          tarih: true,
          saat: true,
          yer: true,
          adres: true,
          servisAciklamasi: true,
          durum: true,
          createdAt: true,
        },
      }),
    ]);

  const historyTotalPages = Math.max(1, Math.ceil(historyCount / HISTORY_PAGE_SIZE));
  const currentLocation =
    latestService?.yer || latestService?.adres || tekne.adres || '';

  return (
    <PageContent data-testid="tekne-profile-page">
      <PageHeader
        title={tekne.ad}
        description="Tekne profili, acik isler ve servis gecmisi"
        breadcrumbs={[
          { label: 'Operasyon', href: '/' },
          { label: 'Tekneler', href: '/tekneler' },
          { label: tekne.ad },
        ]}
        rightActions={
          <>
            <Link href="/tekneler" className="btn btn-secondary h-10 px-4 py-2">
              Listeye Don
            </Link>
            <Link
              href={`/is-emirleri/yeni?boatName=${encodeURIComponent(tekne.ad)}`}
              className="btn btn-primary h-10 px-4 py-2"
            >
              + Bu Tekneye ?? Emri
            </Link>
          </>
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="surface-panel p-4 lg:col-span-2" data-testid="tekne-summary-card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Summary</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border/70 p-3">
              <p className="text-xs text-muted-foreground">Marka / Model</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {[tekne.marka, tekne.model].filter(Boolean).join(' ') || '-'}
              </p>
            </div>
            <div className="rounded-md border border-border/70 p-3">
              <p className="text-xs text-muted-foreground">Seri No</p>
              <p className="mt-1 text-sm font-medium text-foreground">{tekne.seriNo || '-'}</p>
            </div>
            <div className="rounded-md border border-border/70 p-3">
              <p className="text-xs text-muted-foreground">Lokasyon</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {currentLocation ? locationLabel(currentLocation) : '-'}
              </p>
            </div>
            <div className="rounded-md border border-border/70 p-3">
              <p className="text-xs text-muted-foreground">Son Servis</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {latestService?.tarih ? formatDateDdmmyyyShortMonth(latestService.tarih) : '-'}
              </p>
            </div>
            <div className="rounded-md border border-border/70 p-3">
              <p className="text-xs text-muted-foreground">Telefon</p>
              <p className="mt-1 text-sm font-medium text-foreground">{tekne.telefon || '-'}</p>
            </div>
            <div className="rounded-md border border-border/70 p-3">
              <p className="text-xs text-muted-foreground">E-Posta</p>
              <p className="mt-1 text-sm font-medium text-foreground">{tekne.email || '-'}</p>
            </div>
          </div>
          {tekne.aciklama ? (
            <div className="mt-3 rounded-md border border-border/70 p-3">
              <p className="text-xs text-muted-foreground">Not</p>
              <p className="mt-1 text-sm text-foreground">{tekne.aciklama}</p>
            </div>
          ) : null}
        </article>

        <aside className="surface-panel space-y-3 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Operasyon Ozet</h2>
          <div className="rounded-md border border-border/70 p-3">
            <p className="text-xs text-muted-foreground">Acik Isler</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{openCount}</p>
          </div>
          <div className="rounded-md border border-border/70 p-3">
            <p className="text-xs text-muted-foreground">Toplam Servis</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{totalCount}</p>
          </div>
          <div className="rounded-md border border-border/70 p-3">
            <p className="text-xs text-muted-foreground">Durum</p>
            <p className="mt-1 text-sm font-medium text-foreground">{tekne.aktif ? 'Aktif Tekne' : 'Pasif Tekne'}</p>
          </div>
        </aside>
      </section>

      <section className="surface-panel p-4" data-testid="tekne-open-work-orders">
        <div className="mb-3 flex items-center gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Acik Isler</h2>
        </div>
        {openServices.length === 0 ? (
          <PageEmptyState
            title="A??k i? emri bulunamad?"
            description="Bu tekneye ait aktif servis kaydi yok."
            className="min-h-[160px]"
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {openServices.map((service) => {
              const status = getStatusConfig(service.durum);
              return (
                <Link
                  key={service.id}
                  href={`/is-emirleri/${service.id}`}
                  className="rounded-md border border-border/70 p-3 transition hover:border-primary/60 hover:bg-muted/20"
                  data-testid={`tekne-open-service-link-${service.id}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="line-clamp-1 text-sm font-medium text-foreground">
                      {service.servisAciklamasi || 'Servis Kayd?'}
                    </p>
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px]', status.bgColor, status.color)}>
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {service.tarih ? formatDateDdmmyyyShortMonth(service.tarih) : 'Tarihsiz'} {service.saat || '--:--'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{service.yer || service.adres || '-'}</p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="surface-panel p-4" data-testid="tekne-history-list">
        <div className="mb-3 flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Servis Ge?mi?i</h2>
        </div>

        {historyServices.length === 0 ? (
          <PageEmptyState
            title="Servis ge?mi?i bulunamad?"
            description="Bu tekne icin servis kaydi olustugunda burada listelenir."
            className="min-h-[180px]"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse">
                <thead>
                  <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-3">Tarih</th>
                    <th className="px-3 py-3">A??klama</th>
                    <th className="px-3 py-3">Durum</th>
                    <th className="px-3 py-3">Lokasyon</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {historyServices.map((service) => {
                    const status = getStatusConfig(service.durum);
                    return (
                      <tr
                        key={service.id}
                        className="border-b border-border/60 text-sm text-foreground last:border-b-0"
                        data-testid={`tekne-history-row-${service.id}`}
                      >
                        <td className="px-3 py-3">
                          {service.tarih ? formatDateDdmmyyyShortMonth(service.tarih) : '-'} {service.saat || '--:--'}
                        </td>
                        <td className="px-3 py-3">{service.servisAciklamasi || '-'}</td>
                        <td className="px-3 py-3">
                          <span className={cn('rounded-full px-2 py-0.5 text-[11px]', status.bgColor, status.color)}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-3 py-3">{service.yer || service.adres || '-'}</td>
                        <td className="px-3 py-3 text-right">
                          <Link
                            href={`/is-emirleri/${service.id}`}
                            className="btn btn-secondary h-8 px-3 py-1 text-xs"
                            data-testid={`tekne-history-open-service-${service.id}`}
                          >
                            ?? Emrini A?
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className="text-muted-foreground">
                Toplam {historyCount} kay?t ? Sayfa {historyPage} / {historyTotalPages}
              </p>
              <div className="flex items-center gap-2">
                <Link
                  href={`/tekneler/${tekne.id}?page=${Math.max(1, historyPage - 1)}`}
                  className={`btn btn-secondary h-9 px-3 py-2 ${historyPage <= 1 ? 'pointer-events-none opacity-60' : ''}`}
                >
                  Onceki
                </Link>
                <Link
                  href={`/tekneler/${tekne.id}?page=${Math.min(historyTotalPages, historyPage + 1)}`}
                  className={`btn btn-secondary h-9 px-3 py-2 ${historyPage >= historyTotalPages ? 'pointer-events-none opacity-60' : ''}`}
                >
                  Sonraki
                </Link>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="surface-panel p-4">
        <Link href="/takvim" className="btn btn-secondary h-10 px-4 py-2">
          <CalendarDays className="mr-2 h-4 w-4" />
          Takvim Planlamaya Don
        </Link>
      </section>
    </PageContent>
  );
}


