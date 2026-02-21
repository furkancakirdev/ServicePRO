import Link from 'next/link';
import { Prisma, ServisDurumu } from '@prisma/client';
import { Users } from 'lucide-react';
import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { PageEmptyState } from '@/components/ui/page-states';
import { cn } from '@/lib/utils';
import { prisma } from '@/lib/prisma';

type SearchParams = Record<string, string | string[] | undefined>;
type RoleFilter = 'ALL' | 'TEKNISYEN' | 'YETKILI';
type PersonelDurum = 'PASIF' | 'MUSAIT' | 'PLANLI' | 'YOGUN';

const PAGE_SIZE = 20;
const CLOSED_STATUSES: ServisDurumu[] = [ServisDurumu.TAMAMLANDI, ServisDurumu.IPTAL];

function asString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function parsePage(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

function parseRole(value: string): RoleFilter {
  const normalized = value.trim().toLocaleUpperCase('tr-TR');
  if (normalized === 'TEKNISYEN') return 'TEKNISYEN';
  if (normalized === 'YETKILI') return 'YETKILI';
  return 'ALL';
}

function getPersonelDurum(aktif: boolean, aktifIsSayisi: number): PersonelDurum {
  if (!aktif) return 'PASIF';
  if (aktifIsSayisi <= 0) return 'MUSAIT';
  if (aktifIsSayisi <= 2) return 'PLANLI';
  return 'YOGUN';
}

function getDurumLabel(durum: PersonelDurum): string {
  if (durum === 'PASIF') return 'Pasif';
  if (durum === 'MUSAIT') return 'Müsait';
  if (durum === 'PLANLI') return 'Planlı';
  return 'Yoğun';
}

function getDurumChipClass(durum: PersonelDurum): string {
  if (durum === 'PASIF') return 'bg-muted text-muted-foreground border-border';
  if (durum === 'MUSAIT') return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30';
  if (durum === 'PLANLI') return 'bg-amber-500/10 text-amber-700 border-amber-500/30';
  return 'bg-rose-500/10 text-rose-700 border-rose-500/30';
}

function getRoleLabel(rol: string): string {
  return rol === 'yetkili' ? 'Yetkili' : 'Teknisyen';
}

function getUnvanLabel(unvan: string): string {
  if (unvan === 'usta') return 'Usta';
  if (unvan === 'yonetici') return 'Yönetici';
  if (unvan === 'ofis') return 'Ofis';
  return 'Çırak';
}

export default async function PersonnelPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = searchParams ?? {};
  const query = asString(params.q).trim();
  const page = parsePage(asString(params.page));
  const roleFilter = parseRole(asString(params.rol));

  const where: Prisma.PersonelWhereInput = {
    deletedAt: null,
  };

  if (query) {
    where.ad = {
      contains: query,
      mode: 'insensitive',
    };
  }

  if (roleFilter !== 'ALL') {
    where.rol = roleFilter === 'YETKILI' ? 'yetkili' : 'teknisyen';
  }

  const [total, personnel] = await Promise.all([
    prisma.personel.count({ where }),
    prisma.personel.findMany({
      where,
      orderBy: [{ aktif: 'desc' }, { ad: 'asc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        ad: true,
        rol: true,
        unvan: true,
        aktif: true,
      },
    }),
  ]);

  const personnelIds = personnel.map((item) => item.id);
  const openCountsRaw =
    personnelIds.length > 0
      ? await prisma.servicePersonel.groupBy({
          by: ['personelId'],
          where: {
            personelId: { in: personnelIds },
            servis: {
              deletedAt: null,
              durum: { notIn: CLOSED_STATUSES },
            },
          },
          _count: { _all: true },
        })
      : [];

  const openCountMap = new Map(
    openCountsRaw.map((item) => [item.personelId, item._count._all])
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const baseQuery = new URLSearchParams();
  if (query) baseQuery.set('q', query);
  if (roleFilter !== 'ALL') baseQuery.set('rol', roleFilter);

  const prevQuery = new URLSearchParams(baseQuery);
  prevQuery.set('page', String(Math.max(1, page - 1)));
  const nextQuery = new URLSearchParams(baseQuery);
  nextQuery.set('page', String(Math.min(totalPages, page + 1)));

  return (
    <PageContent data-testid="personel-page">
      <PageHeader
        title="Personel"
        description="Atama için ekip yoğunluğu ve açık iş görünümü"
        breadcrumbs={[
          { label: 'Operasyon', href: '/' },
          { label: 'Personel' },
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
            <Users className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Personel ara"
              className="form-input w-full pl-8"
            />
          </label>

          <select name="rol" defaultValue={roleFilter} className="form-select w-full">
            <option value="ALL">Tüm Roller</option>
            <option value="TEKNISYEN">Teknisyen</option>
            <option value="YETKILI">Yetkili</option>
          </select>

          <button type="submit" className="btn btn-secondary h-10 px-4 py-2">
            Filtrele
          </button>
        </form>

        {personnel.length === 0 ? (
          <PageEmptyState
            title={query ? 'Aramaya uygun personel bulunamadi' : 'Personel kaydi bulunamadi'}
            description="Filtreleri temizleyip tekrar deneyebilirsiniz."
            action={
              <Link href="/personel" className="btn btn-secondary h-9 px-4 py-2">
                Filtreleri Temizle
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-3">İsim</th>
                  <th className="px-3 py-3">Rol</th>
                  <th className="px-3 py-3">Açık İş Sayısı</th>
                  <th className="px-3 py-3">Guncel Durum</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {personnel.map((item) => {
                  const openCount = openCountMap.get(item.id) ?? 0;
                  const durum = getPersonelDurum(item.aktif, openCount);
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-border/60 text-sm text-foreground last:border-b-0"
                      data-testid={`personel-row-${item.id}`}
                    >
                      <td className="px-3 py-3">
                        <p className="font-medium">{item.ad}</p>
                        <p className="text-xs text-muted-foreground">{getUnvanLabel(item.unvan)}</p>
                      </td>
                      <td className="px-3 py-3">{getRoleLabel(item.rol)}</td>
                      <td className="px-3 py-3">
                        <span className="chip">{openCount}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium',
                            getDurumChipClass(durum)
                          )}
                        >
                          {getDurumLabel(durum)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/personel/${item.id}`}
                          className="btn btn-secondary h-8 px-3 py-1 text-xs"
                          data-testid={`personel-open-profile-${item.id}`}
                        >
                          Profili Ac
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
            Toplam {total} kayıt - Sayfa {page} / {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={`/personel?${prevQuery.toString()}`}
              className={`btn btn-secondary h-9 px-3 py-2 ${page <= 1 ? 'pointer-events-none opacity-60' : ''}`}
            >
              Önceki
            </Link>
            <Link
              href={`/personel?${nextQuery.toString()}`}
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
