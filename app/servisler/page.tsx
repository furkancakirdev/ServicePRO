'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { DataTable } from '@/components/services/data-table';
import { columns } from '@/components/services/columns';
import { Service } from '@prisma/client';
import { MinimumRole } from '@/components/auth/ProtectedComponents';
import { normalizeServisDurumuForApp } from '@/lib/domain-mappers';
import { CalendarDays, Ship, Filter } from 'lucide-react';

const REQUIRED_SERVICE_FIELDS = ['id', 'tarih', 'tekneAdi', 'servisAciklamasi', 'yer', 'durum'] as const;

function parseInitialStatuses(rawValues: string[]): string[] {
  const normalized = rawValues
    .flatMap((v) => v.split(','))
    .map((v) => normalizeServisDurumuForApp(v.trim()))
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

function ServicesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const limit = 50;

  const initialFilters = useMemo(() => {
    const date = searchParams.get('date') ?? undefined;
    const adresGroup = (searchParams.get('adresGroup') ?? 'HEPSI').toUpperCase();
    const durumValues = searchParams.getAll('durum');
    const statuses = parseInitialStatuses(durumValues);

    return {
      date,
      adresGroup: ['HEPSI', 'YATMARIN', 'NETSEL', 'DIS_SERVIS'].includes(adresGroup)
        ? (adresGroup as 'HEPSI' | 'YATMARIN' | 'NETSEL' | 'DIS_SERVIS')
        : 'HEPSI',
      statuses,
    };
  }, [searchParams]);

  const fetchServices = async (nextPage = 1, append = false) => {
    try {
      const res = await fetch(`/api/services?page=${nextPage}&limit=${limit}&sort=tarih&order=desc`);
      if (!res.ok) throw new Error('Failed to fetch services');
      const data = await res.json();
      const first = data?.services?.[0];
      if (first) {
        const missing = REQUIRED_SERVICE_FIELDS.filter((field) => !(field in first));
        if (missing.length > 0) {
          console.warn('[services] API field mismatch:', missing);
        }
      }
      const incoming = Array.isArray(data.services) ? data.services : [];
      setServices((prev) => (append ? [...prev, ...incoming] : incoming));
      setPage(nextPage);
      const totalPages = Number(data?.pagination?.totalPages || 1);
      setHasMore(nextPage < totalPages);
    } catch (error) {
      console.error(error);
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchServices(1, false);
    }
  }, [isAuthenticated]);

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    fetchServices(page + 1, true);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <section className="hero-panel">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <Ship className="h-6 w-6 text-[var(--color-primary-light)]" />
              Servisler
            </h1>
            <p className="page-subtitle mt-1">Operasyon tablosu ve günlük planlama görünümü</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="chip">
              <CalendarDays className="h-4 w-4" />
              Toplam {services.length} kayıt
            </span>
            <span className="chip">
              <Filter className="h-4 w-4" />
              Tarih, adres ve durum filtreleri aktif
            </span>
          </div>
        </div>
      </section>

      <div className="flex justify-between items-center mb-1">
        <div />
        <MinimumRole minimumRole="YETKILI">
          <button
            onClick={() => router.push('/servisler/yeni')}
            className="btn btn-primary h-10 px-4 py-2"
          >
            + Yeni Servis
          </button>
        </MinimumRole>
      </div>

      <div className="surface-panel p-4">
        <DataTable columns={columns} data={services} searchKey="tekneAdi" initialFilters={initialFilters} />
        <div className="mt-4 flex justify-center">
          {hasMore ? (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="btn btn-secondary h-10 px-4 py-2 disabled:opacity-60"
            >
              {loadingMore ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
            </button>
          ) : (
            <span className="text-sm text-[var(--color-text-muted)]">Tüm kayıtlar yüklendi</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <ServicesPageContent />
    </Suspense>
  );
}
