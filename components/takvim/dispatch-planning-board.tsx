'use client';

import { SearchOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Segmented,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Wrench,
} from 'lucide-react';
import { getStatusConfig } from '@/lib/config/status-config';
import { formatDateDdmmyyyShortMonth, toDateOnlyISO } from '@/lib/date-utils';
import { normalizeServisDurumuForApp } from '@/lib/domain-mappers';
import { cn } from '@/lib/utils';

type ViewMode = 'day' | 'week';

type ServiceRow = {
  id: string;
  tekneAdi: string;
  servisAciklamasi: string;
  tarih: string | null;
  saat: string | null;
  durum: string;
  yer?: string | null;
  adres: string;
};

type ServicesResponse = {
  services: ServiceRow[];
};

type DictionaryResponse = {
  locations?: Array<{
    key: string;
    label: string;
  }>;
};

type LocationOption = {
  key: string;
  label: string;
};

const CLOSED_STATUSES = new Set(['TAMAMLANDI', 'IPTAL']);

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function startOfWeekMonday(input: Date): Date {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const distance = (day + 6) % 7;
  date.setDate(date.getDate() - distance);
  return date;
}

function addDays(input: Date, amount: number): Date {
  const date = new Date(input);
  date.setDate(date.getDate() + amount);
  return date;
}

function dateKey(input: Date): string {
  return toDateOnlyISO(input) ?? '';
}

function dayName(input: Date): string {
  return input.toLocaleDateString('tr-TR', { weekday: 'short' });
}

function serviceLocation(service: ServiceRow): string {
  return (service.yer || service.adres || '').trim();
}

function compareService(a: ServiceRow, b: ServiceRow): number {
  const aTime = a.saat ?? '';
  const bTime = b.saat ?? '';
  if (aTime !== bTime) return aTime.localeCompare(bTime);
  return a.tekneAdi.localeCompare(b.tekneAdi, 'tr');
}

export function DispatchPlanningBoard() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [planningId, setPlanningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailService, setDetailService] = useState<ServiceRow | null>(null);
  const [dropTargetDay, setDropTargetDay] = useState<string | null>(null);

  const fetchData = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = Boolean(opts?.silent);
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const authHeaders = getAuthHeaders();
        const [servicesRes, dictRes] = await Promise.all([
          fetch('/api/services?limit=3000', {
            cache: 'no-store',
            headers: authHeaders,
          }),
          fetch('/api/dictionaries/work-order', {
            cache: 'no-store',
            headers: authHeaders,
          }).catch(() => null),
        ]);

        if (!servicesRes.ok) {
          throw new Error('Takvim verisi alınamadı.');
        }

        const servicesPayload = (await servicesRes.json()) as ServicesResponse;
        const dictPayload =
          dictRes && dictRes.ok ? ((await dictRes.json()) as DictionaryResponse) : null;

        const normalizedServices = (servicesPayload.services ?? []).map((service) => ({
          ...service,
          durum: normalizeServisDurumuForApp(service.durum),
        }));

        const dictionaryLocations = (dictPayload?.locations ?? []).map((item) => ({
          key: item.key,
          label: item.label,
        }));

        const fallbackLocations = Array.from(
          new Set(
            normalizedServices
              .map((service) => serviceLocation(service))
              .filter(Boolean)
          )
        ).map((value) => ({
          key: value,
          label: value,
        }));

        setServices(normalizedServices);
        setLocationOptions(dictionaryLocations.length > 0 ? dictionaryLocations : fallbackLocations);
        setError(null);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Takvim yüklenemedi.');
      } finally {
        if (silent) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const visibleDays = useMemo(() => {
    if (viewMode === 'day') {
      return [new Date(anchorDate)];
    }
    const start = startOfWeekMonday(anchorDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [anchorDate, viewMode]);

  const visibleDayKeys = useMemo(
    () => visibleDays.map((day) => dateKey(day)),
    [visibleDays]
  );

  const visibleDaySet = useMemo(() => new Set(visibleDayKeys), [visibleDayKeys]);

  const scheduledCellMap = useMemo(() => {
    const map = new Map<string, ServiceRow[]>();

    for (const service of services) {
      const serviceDay = toDateOnlyISO(service.tarih);
      if (!serviceDay || !visibleDaySet.has(serviceDay)) continue;
      const current = map.get(serviceDay) ?? [];
      current.push(service);
      map.set(serviceDay, current);
    }

    map.forEach((rows, key) => {
      map.set(key, rows.sort(compareService));
    });

    return map;
  }, [services, visibleDaySet]);

  const unscheduledServices = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('tr-TR');

    return services
      .filter((service) => !toDateOnlyISO(service.tarih))
      .filter((service) => !CLOSED_STATUSES.has(service.durum))
      .filter((service) => {
        if (!q) return true;
        const haystack = `${service.tekneAdi} ${service.servisAciklamasi} ${serviceLocation(service)}`
          .toLocaleLowerCase('tr-TR');
        return haystack.includes(q);
      })
      .filter((service) => {
        if (locationFilter === 'ALL') return true;
        return serviceLocation(service).toLocaleLowerCase('tr-TR') === locationFilter.toLocaleLowerCase('tr-TR');
      })
      .sort(compareService);
  }, [locationFilter, search, services]);

  const rangeLabel = useMemo(() => {
    if (visibleDays.length === 1) {
      return formatDateDdmmyyyShortMonth(visibleDays[0]);
    }
    return `${formatDateDdmmyyyShortMonth(visibleDays[0])} - ${formatDateDdmmyyyShortMonth(
      visibleDays[visibleDays.length - 1]
    )}`;
  }, [visibleDays]);

  const plannedCount = useMemo(
    () => services.filter((service) => Boolean(toDateOnlyISO(service.tarih))).length,
    [services]
  );

  const handleMoveRange = useCallback(
    (direction: -1 | 1) => {
      setAnchorDate((current) => addDays(current, viewMode === 'week' ? 7 * direction : direction));
    },
    [viewMode]
  );

  const resetToday = useCallback(() => {
    setAnchorDate(new Date());
  }, []);

  const handleCardDragStart = useCallback((event: DragEvent<HTMLButtonElement>, serviceId: string) => {
    event.dataTransfer.setData('text/service-id', serviceId);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleCellDragOver = useCallback((event: DragEvent<HTMLTableCellElement>, dayKey: string) => {
    event.preventDefault();
    setDropTargetDay(dayKey);
  }, []);

  const handleCellDragLeave = useCallback((_event: DragEvent<HTMLTableCellElement>, dayKey: string) => {
    setDropTargetDay((current) => (current === dayKey ? null : current));
  }, []);

  const handleSchedule = useCallback(
    async (serviceId: string, dayKey: string) => {
      setPlanningId(serviceId);
      try {
        const response = await fetch(`/api/services/${serviceId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ tarih: dayKey }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          const errorMessage =
            typeof body?.error === 'string' ? body.error : 'Planlama kaydı oluşturulamadı.';
          throw new Error(errorMessage);
        }

        message.success('Planlama tarihi güncellendi.');
        await fetchData({ silent: true });
      } catch (scheduleError) {
        const errorMessage =
          scheduleError instanceof Error ? scheduleError.message : 'Planlama işlemi başarısız.';
        message.error(errorMessage);
      } finally {
        setPlanningId(null);
      }
    },
    [fetchData]
  );

  const handleCellDrop = useCallback(
    (event: DragEvent<HTMLTableCellElement>, dayKey: string) => {
      event.preventDefault();
      setDropTargetDay(null);
      const serviceId = event.dataTransfer.getData('text/service-id');
      if (!serviceId) return;
      void handleSchedule(serviceId, dayKey);
    },
    [handleSchedule]
  );

  if (loading) {
    return (
      <section className="min-w-0">
        <Card className="min-w-0">
          <Space size={10}>
            <Spin size="small" />
            <Typography.Text type="secondary">Takvim planlama yükleniyor...</Typography.Text>
          </Space>
        </Card>
      </section>
    );
  }

  if (error) {
    return (
      <section className="min-w-0">
        <Card className="min-w-0">
          <Space direction="vertical" size={12}>
            <Typography.Text type="danger">{error}</Typography.Text>
            <Button onClick={() => void fetchData()}>Tekrar Dene</Button>
          </Space>
        </Card>
      </section>
    );
  }

  return (
    <section className="min-w-0 space-y-4" data-testid="takvim-planning-board">
      <Card className="min-w-0" styles={{ body: { padding: 16 } }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="chip">
              <CalendarDays className="h-4 w-4" />
              Planlı: {plannedCount}
            </span>
            <span className="chip">
              <Wrench className="h-4 w-4" />
              Planlanmamış: {unscheduledServices.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              value={viewMode}
              options={[
                { label: 'Gün', value: 'day' },
                { label: 'Hafta', value: 'week' },
              ]}
              onChange={(value) => setViewMode(value as ViewMode)}
            />
            <Button
              size="small"
              onClick={() => handleMoveRange(-1)}
              aria-label="Önceki"
              icon={<ChevronLeft className="h-4 w-4" />}
            />
            <Button size="small" onClick={resetToday}>
              Bugün
            </Button>
            <Button
              size="small"
              onClick={() => handleMoveRange(1)}
              aria-label="Sonraki"
              icon={<ChevronRight className="h-4 w-4" />}
            />
            <span className="text-sm font-medium text-foreground">{rangeLabel}</span>
            <Button
              size="small"
              onClick={() => void fetchData({ silent: true })}
              loading={refreshing}
              data-testid="takvim-refresh"
            >
              Yenile
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card
          className="min-w-0 xl:sticky xl:top-4 xl:self-start"
          styles={{ body: { padding: 16 } }}
        >
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">Planlanmamış İşler</h2>
            <p className="text-xs text-muted-foreground">Kartı sürükleyip gün hücresine bırakın.</p>
          </div>

          <div className="space-y-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tekne veya açıklama ara"
              allowClear
              prefix={<SearchOutlined />}
            />
            <Select
              value={locationFilter}
              onChange={setLocationFilter}
              placeholder="Lokasyon seçin"
              options={[
                { value: 'ALL', label: 'Tüm Lokasyonlar' },
                ...locationOptions.map((option) => ({ value: option.key, label: option.label })),
              ]}
              style={{ width: '100%' }}
              popupMatchSelectWidth={false}
            />
          </div>

          <div className="max-h-[62vh] min-w-0 space-y-2 overflow-y-auto pr-1">
            {unscheduledServices.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Planlanmamış iş bulunamadı."
                />
              </div>
            ) : (
              unscheduledServices.map((service) => {
                const status = getStatusConfig(service.durum);
                const isPlanning = planningId === service.id;
                return (
                  <button
                    key={service.id}
                    type="button"
                    draggable={!isPlanning}
                    onDragStart={(event) => handleCardDragStart(event, service.id)}
                    onClick={() => setDetailService(service)}
                    className={cn(
                      'w-full rounded-lg border border-border/70 bg-background p-3 text-left transition',
                      'hover:border-primary/50 hover:bg-muted/20',
                      isPlanning ? 'cursor-wait opacity-60' : 'cursor-grab active:cursor-grabbing'
                    )}
                    data-testid={`takvim-unscheduled-item-${service.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-medium text-foreground">{service.tekneAdi}</p>
                      {isPlanning ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{service.servisAciklamasi}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                      <Tag className={cn('m-0 rounded-full border-none', status.bgColor, status.color)}>
                        {status.label}
                      </Tag>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                        {serviceLocation(service) || '-'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card className="min-w-0 overflow-hidden" styles={{ body: { padding: 0 } }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40">
                  <th className="w-44 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Hat
                  </th>
                  {visibleDays.map((day) => {
                    const key = dateKey(day);
                    return (
                      <th
                        key={key}
                        className="min-w-[210px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        <div>{dayName(day)}</div>
                        <div className="mt-1 text-[11px] font-normal normal-case text-foreground">
                          {formatDateDdmmyyyShortMonth(day)}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th className="align-top px-4 py-3 text-left">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Planlı İşler</p>
                      <p className="text-xs text-muted-foreground">Sadece tarih planlaması</p>
                    </div>
                  </th>
                  {visibleDays.map((day) => {
                    const key = dateKey(day);
                    const cellRows = scheduledCellMap.get(key) ?? [];
                    const isTarget = dropTargetDay === key;

                    return (
                      <td
                        key={`planli-${key}`}
                        className={cn(
                          'align-top p-2 transition',
                          isTarget ? 'bg-primary/10' : 'bg-background'
                        )}
                        onDragOver={(event) => handleCellDragOver(event, key)}
                        onDragLeave={(event) => handleCellDragLeave(event, key)}
                        onDrop={(event) => handleCellDrop(event, key)}
                        data-testid={`takvim-cell-planli-${key}`}
                      >
                        <div className="min-h-[140px] space-y-2 rounded-md border border-dashed border-border/70 p-2">
                          {cellRows.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Buraya sürükleyip planlayın</p>
                          ) : (
                            cellRows.map((service) => {
                              const status = getStatusConfig(service.durum);
                              return (
                                <button
                                  key={service.id}
                                  type="button"
                                  draggable={planningId !== service.id}
                                  onDragStart={(event) => handleCardDragStart(event, service.id)}
                                  onClick={() => setDetailService(service)}
                                  className="w-full rounded-md border border-border bg-muted/25 p-2 text-left transition hover:border-primary/60 hover:bg-muted/40"
                                  data-testid={`takvim-event-${service.id}`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="line-clamp-1 text-xs font-semibold text-foreground">
                                      {service.tekneAdi}
                                    </p>
                                    <span className="text-[11px] text-muted-foreground">
                                      {service.saat || '--:--'}
                                    </span>
                                  </div>
                                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                                    {service.servisAciklamasi}
                                  </p>
                                  <Tag
                                    className={cn(
                                      'mt-2 rounded-full border-none px-2 py-0 text-[10px]',
                                      status.bgColor,
                                      status.color
                                    )}
                                  >
                                    {status.label}
                                  </Tag>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal
        open={Boolean(detailService)}
        onCancel={() => setDetailService(null)}
        title={detailService?.tekneAdi || 'İş Emri'}
        footer={[
          <Button key="kapat" onClick={() => setDetailService(null)}>
            Kapat
          </Button>,
          <Button
            key="detay"
            type="primary"
            disabled={!detailService}
            href={detailService ? `/is-emirleri/${detailService.id}` : undefined}
          >
            İş Emri Detayı
          </Button>,
        ]}
      >
        <Typography.Paragraph type="secondary">Hızlı detay</Typography.Paragraph>
        {detailService ? (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border/70 p-3">
                <p className="text-xs text-muted-foreground">Tarih / Saat</p>
                <p className="mt-1 font-medium text-foreground">
                  {detailService.tarih ? formatDateDdmmyyyShortMonth(detailService.tarih) : 'Tarihsiz'}{' '}
                  {detailService.saat || '--:--'}
                </p>
              </div>
              <div className="rounded-md border border-border/70 p-3">
                <p className="text-xs text-muted-foreground">Lokasyon</p>
                <p className="mt-1 font-medium text-foreground">{serviceLocation(detailService) || '-'}</p>
              </div>
            </div>
            <div className="rounded-md border border-border/70 p-3">
              <p className="text-xs text-muted-foreground">Açıklama</p>
              <p className="mt-1 text-foreground">{detailService.servisAciklamasi || '-'}</p>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}

export default DispatchPlanningBoard;