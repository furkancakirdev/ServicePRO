'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  Search,
  Users,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getStatusConfig } from '@/lib/config/status-config';
import { formatDateDdmmyyyShortMonth, toDateOnlyISO } from '@/lib/date-utils';
import { normalizeServisDurumuForApp } from '@/lib/domain-mappers';
import { cn } from '@/lib/utils';

type ViewMode = 'week' | 'day';
type ResourceKind = 'TECHNICIAN' | 'UNASSIGNED';

type ServiceAssignment = {
  rol?: string;
  personelId?: string;
  personel?: {
    id?: string;
    ad?: string;
  };
};

type ServiceRow = {
  id: string;
  tekneAdi: string;
  servisAciklamasi: string;
  tarih: string | null;
  saat: string | null;
  planlananSureSaat?: number | null;
  tahminiSureSaat?: number | null;
  durationHours?: number | null;
  durum: string;
  yer?: string | null;
  adres: string;
  personeller?: ServiceAssignment[];
};

type ServicesResponse = {
  services: ServiceRow[];
};

type PersonnelRow = {
  id: string;
  ad: string;
  aktif?: boolean;
};

type DictionaryResponse = {
  locations?: Array<{
    key: string;
    label: string;
  }>;
};

type ResourceLane = {
  id: string;
  label: string;
  kind: ResourceKind;
};

type LocationOption = {
  key: string;
  label: string;
};

type AssignmentPayload = {
  personelId: string;
  rol: 'SORUMLU' | 'DESTEK';
};

const UNASSIGNED_RESOURCE_ID = '__UNASSIGNED__';
const CLOSED_STATUSES = new Set(['TAMAMLANDI', 'IPTAL']);

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function normalizeStatus(value: string): string {
  return normalizeServisDurumuForApp(value || '');
}

function normalizeRole(value: unknown): 'SORUMLU' | 'DESTEK' {
  const role = String(value ?? '')
    .trim()
    .toUpperCase();
  return role === 'SORUMLU' ? 'SORUMLU' : 'DESTEK';
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

function getAssignmentPayload(service: ServiceRow): AssignmentPayload[] {
  const map = new Map<string, AssignmentPayload>();
  for (const assignment of service.personeller ?? []) {
    const personelId = assignment.personel?.id ?? assignment.personelId;
    if (!personelId) continue;
    if (!map.has(personelId)) {
      map.set(personelId, {
        personelId,
        rol: normalizeRole(assignment.rol),
      });
    }
  }
  return Array.from(map.values());
}

function getPrimaryResourceId(service: ServiceRow): string {
  const assignments = getAssignmentPayload(service);
  if (assignments.length === 0) return UNASSIGNED_RESOURCE_ID;
  const owner = assignments.find((item) => item.rol === 'SORUMLU');
  return owner?.personelId ?? assignments[0]?.personelId ?? UNASSIGNED_RESOURCE_ID;
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

function parseHourRange(value: string | null): number | null {
  if (!value) return null;
  const parts = value.split('-').map((item) => item.trim());
  if (parts.length !== 2) return null;
  const parseToMinutes = (time: string): number | null => {
    const [hourRaw, minuteRaw] = time.split(':');
    const hour = Number.parseInt(hourRaw ?? '', 10);
    const minute = Number.parseInt(minuteRaw ?? '', 10);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return hour * 60 + minute;
  };
  const start = parseToMinutes(parts[0]);
  const end = parseToMinutes(parts[1]);
  if (start === null || end === null || end <= start) return null;
  return Number(((end - start) / 60).toFixed(1));
}

function estimatedHours(service: ServiceRow): number | null {
  const directCandidates = [service.planlananSureSaat, service.tahminiSureSaat, service.durationHours];
  for (const candidate of directCandidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
      return candidate;
    }
  }
  return parseHourRange(service.saat);
}

export function DispatchPlanningBoard() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [technicians, setTechnicians] = useState<PersonnelRow[]>([]);
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [planningId, setPlanningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailService, setDetailService] = useState<ServiceRow | null>(null);
  const [dropTarget, setDropTarget] = useState<{ resourceId: string; dayKey: string } | null>(null);

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

        const [servicesRes, personnelRes, dictRes] = await Promise.all([
          fetch('/api/services?limit=3000', {
            cache: 'no-store',
            headers: authHeaders,
          }),
          fetch('/api/personel?aktif=true', {
            cache: 'no-store',
            headers: authHeaders,
          }),
          fetch('/api/dictionaries/work-order', {
            cache: 'no-store',
            headers: authHeaders,
          }).catch(() => null),
        ]);

        if (!servicesRes.ok) {
          throw new Error('Takvim verisi alinamadi');
        }
        if (!personnelRes.ok) {
          throw new Error('Teknisyen listesi alinamadi');
        }

        const servicesPayload = (await servicesRes.json()) as ServicesResponse;
        const personnelPayload = (await personnelRes.json()) as PersonnelRow[];
        const dictPayload =
          dictRes && dictRes.ok ? ((await dictRes.json()) as DictionaryResponse) : null;

        const normalizedServices = (servicesPayload.services ?? []).map((service) => ({
          ...service,
          durum: normalizeStatus(service.durum),
        }));

        const activeTechnicians = (personnelPayload ?? [])
          .filter((item) => item.aktif !== false)
          .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));

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
        setTechnicians(activeTechnicians);
        setLocationOptions(dictionaryLocations.length > 0 ? dictionaryLocations : fallbackLocations);
        setError(null);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Takvim yuklenemedi');
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

  const resources = useMemo<ResourceLane[]>(
    () => [
      { id: UNASSIGNED_RESOURCE_ID, label: 'Atanmamis', kind: 'UNASSIGNED' },
      ...technicians.map((technician) => ({
        id: technician.id,
        label: technician.ad,
        kind: 'TECHNICIAN' as const,
      })),
    ],
    [technicians]
  );

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

      const resourceId = getPrimaryResourceId(service);
      const key = `${resourceId}__${serviceDay}`;
      const current = map.get(key) ?? [];
      current.push(service);
      map.set(key, current);
    }

    map.forEach((rows, key) => {
      map.set(key, rows.sort(compareService));
    });

    return map;
  }, [services, visibleDaySet]);

  const unscheduledServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services
      .filter((service) => !toDateOnlyISO(service.tarih))
      .filter((service) => !CLOSED_STATUSES.has(service.durum))
      .filter((service) => {
        if (!q) return true;
        const haystack = `${service.tekneAdi} ${service.servisAciklamasi} ${serviceLocation(service)}`
          .toLowerCase();
        return haystack.includes(q);
      })
      .filter((service) => {
        if (locationFilter === 'ALL') return true;
        const location = serviceLocation(service);
        return location.toLowerCase() === locationFilter.toLowerCase();
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

  const calendarCount = useMemo(
    () => services.filter((service) => Boolean(toDateOnlyISO(service.tarih))).length,
    [services]
  );

  const resourceCapacityMap = useMemo(() => {
    const map = new Map<string, { jobCount: number; totalHours: number; hasHours: boolean }>();

    for (const resource of resources) {
      map.set(resource.id, { jobCount: 0, totalHours: 0, hasHours: false });
    }

    for (const service of services) {
      const serviceDay = toDateOnlyISO(service.tarih);
      if (!serviceDay || !visibleDaySet.has(serviceDay)) continue;

      const resourceId = getPrimaryResourceId(service);
      const current = map.get(resourceId) ?? { jobCount: 0, totalHours: 0, hasHours: false };
      current.jobCount += 1;
      const hour = estimatedHours(service);
      if (hour !== null) {
        current.totalHours += hour;
        current.hasHours = true;
      }
      map.set(resourceId, current);
    }

    return map;
  }, [resources, services, visibleDaySet]);

  const handleMoveRange = useCallback(
    (direction: -1 | 1) => {
      setAnchorDate((current) => addDays(current, viewMode === 'week' ? 7 * direction : direction));
    },
    [viewMode]
  );

  const resetToday = useCallback(() => {
    setAnchorDate(new Date());
  }, []);

  const handleCardDragStart = useCallback((event: React.DragEvent<HTMLButtonElement>, serviceId: string) => {
    event.dataTransfer.setData('text/service-id', serviceId);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleCellDragOver = useCallback(
    (event: React.DragEvent<HTMLTableCellElement>, resourceId: string, dayKey: string) => {
      event.preventDefault();
      setDropTarget({ resourceId, dayKey });
    },
    []
  );

  const handleCellDragLeave = useCallback(
    (_event: React.DragEvent<HTMLTableCellElement>, resourceId: string, dayKey: string) => {
      setDropTarget((current) => {
        if (!current) return null;
        if (current.resourceId === resourceId && current.dayKey === dayKey) return null;
        return current;
      });
    },
    []
  );

  const handleSchedule = useCallback(
    async (serviceId: string, resourceId: string, dayKey: string) => {
      const service = services.find((row) => row.id === serviceId);
      if (!service) return;

      setPlanningId(serviceId);
      try {
        const assignments = getAssignmentPayload(service);
        let nextAssignments = assignments;

        if (resourceId !== UNASSIGNED_RESOURCE_ID && !assignments.some((item) => item.personelId === resourceId)) {
          const hasOwner = assignments.some((item) => item.rol === 'SORUMLU');
          nextAssignments = [
            ...assignments,
            {
              personelId: resourceId,
              rol: hasOwner ? 'DESTEK' : 'SORUMLU',
            },
          ];
        }

        const payload: Record<string, unknown> = { tarih: dayKey };
        if (resourceId !== UNASSIGNED_RESOURCE_ID) {
          payload.personeller = nextAssignments;
        }

        const response = await fetch(`/api/services/${serviceId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || 'Planlama kaydi olusturulamadi');
        }

        toast.success('Is emri takvime planlandi');
        await fetchData({ silent: true });
      } catch (scheduleError) {
        const message =
          scheduleError instanceof Error ? scheduleError.message : 'Planlama islemi basarisiz';
        toast.error(message);
      } finally {
        setPlanningId(null);
      }
    },
    [fetchData, services]
  );

  const handleCellDrop = useCallback(
    (event: React.DragEvent<HTMLTableCellElement>, resourceId: string, dayKey: string) => {
      event.preventDefault();
      setDropTarget(null);
      const serviceId = event.dataTransfer.getData('text/service-id');
      if (!serviceId) return;
      void handleSchedule(serviceId, resourceId, dayKey);
    },
    [handleSchedule]
  );

  if (loading) {
    return (
      <section className="surface-panel p-6">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Takvim planlama yukleniyor...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="surface-panel space-y-3 p-6">
        <p className="text-sm text-destructive">{error}</p>
        <Button onClick={() => void fetchData()}>Tekrar Dene</Button>
      </section>
    );
  }

  return (
    <section className="space-y-4" data-testid="takvim-planning-board">
      <div className="surface-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="chip">
              <CalendarDays className="h-4 w-4" />
              Planli: {calendarCount}
            </span>
            <span className="chip">
              <Wrench className="h-4 w-4" />
              Planlanmamis: {unscheduledServices.length}
            </span>
            <span className="chip">
              <Users className="h-4 w-4" />
              Teknisyen: {technicians.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={viewMode === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('day')}
              data-testid="takvim-view-day"
            >
              Gun
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('week')}
              data-testid="takvim-view-week"
            >
              Hafta
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleMoveRange(-1)} aria-label="Onceki">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={resetToday}>
              Bugun
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleMoveRange(1)} aria-label="Sonraki">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-foreground">{rangeLabel}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchData({ silent: true })}
              disabled={refreshing}
              data-testid="takvim-refresh"
            >
              {refreshing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Yenile
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="surface-panel space-y-4 p-4 xl:sticky xl:top-4 xl:self-start">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground">Planlanmamis Isler</h2>
            <p className="text-xs text-muted-foreground">
              Karti surukleyip bir teknisyen/sutun hucresine birakin.
            </p>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tekne veya aciklama ara"
                className="pl-8"
              />
            </div>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Lokasyon secin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tum Lokasyonlar</SelectItem>
                {locationOptions.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-[62vh] space-y-2 overflow-y-auto pr-1">
            {unscheduledServices.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Planlanmamis is bulunamadi.
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
                      <Badge className={cn('rounded-full', status.bgColor, status.color)}>{status.label}</Badge>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                        {serviceLocation(service) || '-'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <div className="surface-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40">
                  <th className="w-48 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Resource
                  </th>
                  {visibleDays.map((day) => {
                    const key = dateKey(day);
                    return (
                      <th
                        key={key}
                        className="min-w-[190px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
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
                {resources.map((resource) => (
                  <tr key={resource.id} className="border-b border-border/70 last:border-b-0">
                    <th className="align-top px-4 py-3 text-left">
                      {(() => {
                        const summary = resourceCapacityMap.get(resource.id) ?? {
                          jobCount: 0,
                          totalHours: 0,
                          hasHours: false,
                        };
                        const hourLabel = summary.hasHours ? summary.totalHours.toFixed(1) : '-';
                        return (
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">{resource.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {resource.kind === 'UNASSIGNED' ? 'Atama bekleyen lane' : 'Teknisyen lane'}
                            </p>
                            <p
                              className="text-[11px] text-muted-foreground"
                              data-testid={`takvim-resource-capacity-${resource.id}`}
                            >
                              Is: {summary.jobCount} • Saat: {hourLabel}
                            </p>
                          </div>
                        );
                      })()}
                    </th>
                    {visibleDays.map((day) => {
                      const key = dateKey(day);
                      const cellKey = `${resource.id}__${key}`;
                      const cellRows = scheduledCellMap.get(cellKey) ?? [];
                      const isTarget =
                        dropTarget?.resourceId === resource.id && dropTarget?.dayKey === key;

                      return (
                        <td
                          key={`${resource.id}-${key}`}
                          className={cn(
                            'align-top p-2 transition',
                            isTarget ? 'bg-primary/10' : 'bg-background'
                          )}
                          onDragOver={(event) => handleCellDragOver(event, resource.id, key)}
                          onDragLeave={(event) => handleCellDragLeave(event, resource.id, key)}
                          onDrop={(event) => handleCellDrop(event, resource.id, key)}
                          data-testid={`takvim-cell-${resource.id}-${key}`}
                        >
                          <div className="min-h-[128px] space-y-2 rounded-md border border-dashed border-border/70 p-2">
                            {cellRows.length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                Buraya surukle ve planla
                              </p>
                            ) : (
                              cellRows.map((service) => {
                                const status = getStatusConfig(service.durum);
                                return (
                                  <button
                                    key={service.id}
                                    type="button"
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
                                    <Badge
                                      className={cn(
                                        'mt-2 rounded-full px-2 py-0 text-[10px]',
                                        status.bgColor,
                                        status.color
                                      )}
                                    >
                                      {status.label}
                                    </Badge>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={Boolean(detailService)} onOpenChange={(open) => (!open ? setDetailService(null) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detailService?.tekneAdi || 'Is Emri'}</DialogTitle>
            <DialogDescription>Hizli detay ve aksiyonlar</DialogDescription>
          </DialogHeader>

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
                <div className="rounded-md border border-border/70 p-3">
                  <p className="text-xs text-muted-foreground">Durum</p>
                  <p className="mt-1 font-medium text-foreground">{getStatusConfig(detailService.durum).label}</p>
                </div>
                <div className="rounded-md border border-border/70 p-3">
                  <p className="text-xs text-muted-foreground">Atanan</p>
                  <p className="mt-1 font-medium text-foreground">
                    {getAssignmentPayload(detailService).length > 0
                      ? `${getAssignmentPayload(detailService).length} kisi`
                      : 'Atama yok'}
                  </p>
                </div>
              </div>

              <div className="rounded-md border border-border/70 p-3">
                <p className="text-xs text-muted-foreground">Aciklama</p>
                <p className="mt-1 text-foreground">{detailService.servisAciklamasi || '-'}</p>
              </div>
            </div>
          ) : null}

          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setDetailService(null)}>
              Kapat
            </Button>
            {detailService ? (
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link href={`/servisler/${detailService.id}`}>
                    <Clock3 className="mr-1 h-4 w-4" />
                    Detayi Ac
                  </Link>
                </Button>
                <Button asChild>
                  <Link href={`/servisler/${detailService.id}/duzenle`}>Duzenle</Link>
                </Button>
              </div>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default DispatchPlanningBoard;
