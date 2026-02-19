'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';
import trLocale from '@fullcalendar/core/locales/tr';
import { DateSelectArg, EventClickArg, EventDropArg } from '@fullcalendar/core';
import { Calendar, CalendarDays, Filter, MapPin, RefreshCw, Ship, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { MinimumRole } from '@/components/auth/ProtectedComponents';
import { useAuth } from '@/lib/hooks/use-auth';
import { DURUM_CONFIG, type ServisDurumu } from '@/types';
import { parseDateOnlyToUtcDate, toDateOnlyISO } from '@/lib/date-utils';

type LocationGroup = 'YATMARIN' | 'NETSEL' | 'DIS_SERVIS';
type PresetFilter = 'ALL' | 'THIS_WEEK' | 'UNASSIGNED' | 'UNSCHEDULED' | 'OVERDUE' | 'ACTIVE';

interface ApiAssignment {
  rol?: string;
  personelAd?: string;
  personel?: {
    ad?: string;
  };
}

interface ServiceApiItem {
  id: string;
  tarih?: string | null;
  saat?: string | null;
  tekneAdi: string;
  durum: ServisDurumu;
  adres: string;
  yer?: string | null;
  isTuru: string;
  servisAciklamasi: string;
  personeller?: ApiAssignment[];
}

interface ServicesResponse {
  services: ServiceApiItem[];
}

interface PersonelResponseItem {
  id: string;
  aktif?: boolean;
}

interface SelectedServiceState {
  service: ServiceApiItem;
  dateLabel: string;
}

const CLOSED_STATUSES = new Set<ServisDurumu>(['TAMAMLANDI', 'IPTAL', 'ERTELENDI']);
const PRESET_OPTIONS: Array<{ value: PresetFilter; label: string }> = [
  { value: 'ALL', label: 'Tum Isler' },
  { value: 'ACTIVE', label: 'Aktif Isler' },
  { value: 'THIS_WEEK', label: 'Bu Hafta Plani' },
  { value: 'OVERDUE', label: 'Gecikenler' },
  { value: 'UNASSIGNED', label: 'Atama Eksikleri' },
  { value: 'UNSCHEDULED', label: 'Tarihsiz Isler' },
];

function locationGroupFrom(yer?: string | null, adres?: string | null): LocationGroup {
  const normalized = `${yer ?? ''} ${adres ?? ''}`.toUpperCase();
  if (normalized.includes('YATMARIN') || normalized.includes('YATMARIN')) return 'YATMARIN';
  if (normalized.includes('NETSEL')) return 'NETSEL';
  return 'DIS_SERVIS';
}

function startOfCurrentWeek(date = new Date()): Date {
  const start = new Date(date);
  const day = start.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + offset);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfWeekInclusive(startOfWeek: Date): Date {
  const end = new Date(startOfWeek);
  end.setDate(startOfWeek.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function formatDateLabel(value?: string | null): string {
  const parsed = parseDateOnlyToUtcDate(value ?? null);
  if (!parsed) return 'Tarihsiz';
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(parsed);
}

function isOverdue(service: ServiceApiItem): boolean {
  if (!service.tarih || CLOSED_STATUSES.has(service.durum)) return false;
  const scheduledDate = parseDateOnlyToUtcDate(service.tarih);
  if (!scheduledDate) return false;

  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
  return scheduledDate.getTime() < todayUtc.getTime();
}

function assignmentCount(service: ServiceApiItem): number {
  return service.personeller?.length ?? 0;
}

function isInCurrentWeek(service: ServiceApiItem, weekStart: Date, weekEnd: Date): boolean {
  if (!service.tarih) return false;
  const date = parseDateOnlyToUtcDate(service.tarih);
  if (!date) return false;
  return date >= weekStart && date <= weekEnd;
}

export default function OperationsOverviewPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [services, setServices] = useState<ServiceApiItem[]>([]);
  const [activeTechnicianCount, setActiveTechnicianCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [locationFilter, setLocationFilter] = useState<'ALL' | LocationGroup>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ServisDurumu>('ALL');
  const [presetFilter, setPresetFilter] = useState<PresetFilter>('ALL');

  const [selectedService, setSelectedService] = useState<SelectedServiceState | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const [dragDialogOpen, setDragDialogOpen] = useState(false);
  const [dragInfo, setDragInfo] = useState<{ serviceId: string; oldDate: string; newDate: string } | null>(null);

  const hasInitializedRef = useRef(false);

  const weekStart = useMemo(() => startOfCurrentWeek(), []);
  const weekEnd = useMemo(() => endOfWeekInclusive(weekStart), [weekStart]);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;

    const updateRefreshState = hasInitializedRef.current;
    if (updateRefreshState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [servicesResponse, personnelResponse] = await Promise.all([
        fetch('/api/services?limit=3000', { cache: 'no-store' }),
        fetch('/api/personel?aktif=true', { cache: 'no-store' }),
      ]);

      if (!servicesResponse.ok) throw new Error('Servisler yuklenemedi');

      const servicesPayload = (await servicesResponse.json()) as ServicesResponse;
      const rows = [...servicesPayload.services].sort((left, right) => {
        const leftDate = left.tarih ?? '';
        const rightDate = right.tarih ?? '';
        if (leftDate !== rightDate) return leftDate.localeCompare(rightDate);

        const leftTime = left.saat ?? '';
        const rightTime = right.saat ?? '';
        if (leftTime !== rightTime) return leftTime.localeCompare(rightTime);

        return left.tekneAdi.localeCompare(right.tekneAdi, 'tr');
      });

      setServices(rows);

      if (personnelResponse.ok) {
        const personnel = (await personnelResponse.json()) as PersonelResponseItem[];
        setActiveTechnicianCount(personnel.length);
      }

      hasInitializedRef.current = true;
    } catch (error) {
      console.error('Takvim verileri yuklenemedi', error);
      toast.error('Operasyon verileri yuklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchData();
  }, [fetchData, isAuthenticated]);

  const filteredServices = useMemo(() => {
    let rows = [...services];

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      rows = rows.filter((service) => {
        const haystack = [
          service.tekneAdi,
          service.servisAciklamasi,
          service.adres,
          service.yer ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    if (locationFilter !== 'ALL') {
      rows = rows.filter((service) => locationGroupFrom(service.yer, service.adres) === locationFilter);
    }

    if (statusFilter !== 'ALL') {
      rows = rows.filter((service) => service.durum === statusFilter);
    }

    switch (presetFilter) {
      case 'ACTIVE':
        rows = rows.filter((service) => !CLOSED_STATUSES.has(service.durum));
        break;
      case 'THIS_WEEK':
        rows = rows.filter((service) => isInCurrentWeek(service, weekStart, weekEnd));
        break;
      case 'UNASSIGNED':
        rows = rows.filter((service) => assignmentCount(service) === 0);
        break;
      case 'UNSCHEDULED':
        rows = rows.filter((service) => !service.tarih);
        break;
      case 'OVERDUE':
        rows = rows.filter((service) => isOverdue(service));
        break;
      default:
        break;
    }

    return rows;
  }, [locationFilter, presetFilter, searchText, services, statusFilter, weekEnd, weekStart]);

  const scheduledServices = useMemo(
    () => filteredServices.filter((service) => Boolean(toDateOnlyISO(service.tarih))),
    [filteredServices]
  );

  const calendarEvents = useMemo(
    () =>
      scheduledServices.map((service) => {
        const eventDate = toDateOnlyISO(service.tarih) ?? new Date().toISOString().slice(0, 10);
        const color = DURUM_CONFIG[service.durum]?.color ?? '#64748b';

        return {
          id: service.id,
          title: service.tekneAdi,
          start: eventDate,
          allDay: true,
          backgroundColor: color,
          borderColor: color,
          extendedProps: {
            service,
          },
        };
      }),
    [scheduledServices]
  );

  const summary = useMemo(() => {
    const openServices = filteredServices.filter((service) => !CLOSED_STATUSES.has(service.durum));
    const unassigned = openServices.filter((service) => assignmentCount(service) === 0).length;
    const unscheduled = openServices.filter((service) => !service.tarih).length;
    const thisWeek = openServices.filter((service) => isInCurrentWeek(service, weekStart, weekEnd)).length;

    const weeklyCapacity = Math.max(activeTechnicianCount, 1) * 5;
    const capacityUsage = Math.min(100, Math.round((thisWeek / weeklyCapacity) * 100));

    return {
      total: filteredServices.length,
      open: openServices.length,
      unassigned,
      unscheduled,
      thisWeek,
      weeklyCapacity,
      capacityUsage,
      overdue: openServices.filter((service) => isOverdue(service)).length,
    };
  }, [activeTechnicianCount, filteredServices, weekEnd, weekStart]);

  const dailyLoad = useMemo(() => {
    const openScheduled = filteredServices.filter(
      (service) => !CLOSED_STATUSES.has(service.durum) && Boolean(service.tarih)
    );

    return Array.from({ length: 7 }, (_, dayOffset) => {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() + dayOffset);
      const dayIso = day.toISOString().slice(0, 10);

      const count = openScheduled.filter((service) => toDateOnlyISO(service.tarih) === dayIso).length;
      const usage = activeTechnicianCount > 0 ? Math.min(100, Math.round((count / activeTechnicianCount) * 100)) : 0;

      return {
        key: dayIso,
        label: new Intl.DateTimeFormat('tr-TR', { weekday: 'short' }).format(day),
        dateLabel: new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit' }).format(day),
        count,
        usage,
      };
    });
  }, [activeTechnicianCount, filteredServices]);

  const locationBreakdown = useMemo(() => {
    const buckets: Record<LocationGroup, number> = {
      YATMARIN: 0,
      NETSEL: 0,
      DIS_SERVIS: 0,
    };

    filteredServices
      .filter((service) => !CLOSED_STATUSES.has(service.durum))
      .forEach((service) => {
        const bucket = locationGroupFrom(service.yer, service.adres);
        buckets[bucket] += 1;
      });

    return [
      { key: 'YATMARIN', label: 'Yatmarin', count: buckets.YATMARIN },
      { key: 'NETSEL', label: 'Netsel', count: buckets.NETSEL },
      { key: 'DIS_SERVIS', label: 'Dis Servis', count: buckets.DIS_SERVIS },
    ] as const;
  }, [filteredServices]);

  const attentionQueue = useMemo(() => {
    return filteredServices
      .filter((service) => !service.tarih || assignmentCount(service) === 0 || isOverdue(service))
      .sort((left, right) => {
        const leftScore = Number(!left.tarih) * 3 + Number(assignmentCount(left) === 0) * 2 + Number(isOverdue(left));
        const rightScore = Number(!right.tarih) * 3 + Number(assignmentCount(right) === 0) * 2 + Number(isOverdue(right));

        if (leftScore !== rightScore) return rightScore - leftScore;

        const leftDate = toDateOnlyISO(left.tarih) ?? '9999-12-31';
        const rightDate = toDateOnlyISO(right.tarih) ?? '9999-12-31';
        return leftDate.localeCompare(rightDate);
      })
      .slice(0, 10);
  }, [filteredServices]);

  const resetFilters = useCallback(() => {
    setSearchText('');
    setLocationFilter('ALL');
    setStatusFilter('ALL');
    setPresetFilter('ALL');
  }, []);

  const handleDateSelect = useCallback(
    (selection: DateSelectArg) => {
      router.push(`/servisler/yeni?tarih=${selection.startStr}`);
    },
    [router]
  );

  const handleEventClick = useCallback((eventInfo: EventClickArg) => {
    const service = (eventInfo.event.extendedProps as { service?: ServiceApiItem }).service;
    if (!service) return;

    setSelectedService({
      service,
      dateLabel: formatDateLabel(service.tarih),
    });
    setDetailDialogOpen(true);
  }, []);

  const handleEventDrop = useCallback((eventInfo: EventDropArg) => {
    const oldDate = toDateOnlyISO(eventInfo.oldEvent.startStr);
    const newDate = toDateOnlyISO(eventInfo.event.startStr);

    if (!oldDate || !newDate || oldDate === newDate) {
      eventInfo.revert();
      return;
    }

    setDragInfo({
      serviceId: eventInfo.event.id,
      oldDate,
      newDate,
    });
    setDragDialogOpen(true);
    eventInfo.revert();
  }, []);

  const confirmDateChange = useCallback(async () => {
    if (!dragInfo) return;

    try {
      const response = await fetch(`/api/services/${dragInfo.serviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tarih: dragInfo.newDate }),
      });

      if (!response.ok) throw new Error('Tarih degisikligi basarisiz');

      toast.success('Servis tarihi guncellendi');
      await fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Servis tarihi guncellenemedi');
    } finally {
      setDragDialogOpen(false);
      setDragInfo(null);
    }
  }, [dragInfo, fetchData]);

  const goToEditPage = useCallback(() => {
    if (!selectedService) return;
    router.push(`/servisler/${selectedService.service.id}/duzenle`);
  }, [router, selectedService]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-8" data-testid="operations-overview-page">
      <div className="hero-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="page-title flex items-center gap-2 text-white">
              <Calendar className="h-6 w-6 text-cyan-200" />
              Operasyon Gorunumu
            </h1>
            <p className="page-subtitle mt-1 text-slate-200">
              Takvim, atama aciklari ve haftalik yogunluk tek ekranda
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-slate-600 bg-slate-900/30 text-slate-100"
              onClick={fetchData}
              disabled={refreshing}
              data-testid="operations-refresh"
            >
              <RefreshCw className={`mr-1 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Yenile
            </Button>
            <Button type="button" onClick={() => router.push('/servisler')} data-testid="operations-services-list">
              Servis Listesi
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Card className="border-white/20 bg-black/20 text-white">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-cyan-200">Acik Isler</p>
              <p className="mt-1 text-2xl font-semibold">{summary.open}</p>
            </CardContent>
          </Card>
          <Card className="border-white/20 bg-black/20 text-white">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-cyan-200">Atanmamis</p>
              <p className="mt-1 text-2xl font-semibold">{summary.unassigned}</p>
            </CardContent>
          </Card>
          <Card className="border-white/20 bg-black/20 text-white">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-cyan-200">Tarihsiz</p>
              <p className="mt-1 text-2xl font-semibold">{summary.unscheduled}</p>
            </CardContent>
          </Card>
          <Card className="border-white/20 bg-black/20 text-white">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-cyan-200">Bu Hafta Planlanan</p>
              <p className="mt-1 text-2xl font-semibold">{summary.thisWeek}</p>
            </CardContent>
          </Card>
          <Card className="border-white/20 bg-black/20 text-white">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-cyan-200">Kapasite Kullanim</p>
              <p className="mt-1 text-2xl font-semibold">%{summary.capacityUsage}</p>
              <p className="text-xs text-slate-300">{summary.thisWeek}/{summary.weeklyCapacity} haftalik slot</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="surface-panel">
        <CardContent className="pt-4">
          <div className="grid gap-3 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Tekne, aciklama veya lokasyon ara..."
                data-testid="operations-search"
              />
            </div>
            <div className="lg:col-span-2">
              <Select value={presetFilter} onValueChange={(value) => setPresetFilter(value as PresetFilter)}>
                <SelectTrigger data-testid="operations-preset-filter">
                  <SelectValue placeholder="Preset" />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
                  {PRESET_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-2">
              <Select value={locationFilter} onValueChange={(value) => setLocationFilter(value as 'ALL' | LocationGroup)}>
                <SelectTrigger data-testid="operations-location-filter">
                  <SelectValue placeholder="Lokasyon" />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
                  <SelectItem value="ALL">Tum Lokasyonlar</SelectItem>
                  <SelectItem value="YATMARIN">Yatmarin</SelectItem>
                  <SelectItem value="NETSEL">Netsel</SelectItem>
                  <SelectItem value="DIS_SERVIS">Dis Servis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-2">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'ALL' | ServisDurumu)}>
                <SelectTrigger data-testid="operations-status-filter">
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-900 text-slate-100">
                  <SelectItem value="ALL">Tum Durumlar</SelectItem>
                  {Object.entries(DURUM_CONFIG).map(([value, config]) => (
                    <SelectItem key={value} value={value}>
                      {config.icon} {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-end gap-2 lg:col-span-2">
              <Badge variant="outline">{filteredServices.length} is</Badge>
              <Button type="button" variant="outline" onClick={resetFilters}>
                <Filter className="mr-1 h-4 w-4" />
                Sifirla
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <Card className="calendar-shell" data-testid="operations-calendar-panel">
            <CardContent className="pt-6">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                locale={trLocale}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'timeGridWeek,dayGridMonth,listWeek',
                }}
                buttonText={{
                  today: 'Bugun',
                  month: 'Ay',
                  week: 'Hafta',
                  day: 'Gun',
                  list: 'Liste',
                }}
                events={calendarEvents}
                selectable
                selectMirror
                select={handleDateSelect}
                eventClick={handleEventClick}
                editable
                eventDrop={handleEventDrop}
                height="auto"
                nowIndicator
                stickyHeaderDates
                eventDidMount={(info) => {
                  const service = (info.event.extendedProps as { service?: ServiceApiItem }).service;
                  if (!service) return;
                  info.el.title = `${service.tekneAdi}\n${service.yer ?? service.adres}\n${service.servisAciklamasi}`;
                }}
              />
            </CardContent>
          </Card>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              Durum renkleri
            </span>
            {Object.entries(DURUM_CONFIG).map(([value, config]) => (
              <span key={value} className="chip">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: config.color }} />
                <span className="text-xs">{config.icon} {config.label}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-4 xl:col-span-4">
          <Card className="surface-panel" data-testid="operations-load-panel">
            <CardContent className="space-y-3 pt-4">
              <p className="text-sm font-semibold text-white">7 Gunluk Yogunluk</p>
              {dailyLoad.map((day) => (
                <div key={day.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-200">
                    <span>{day.label} {day.dateLabel}</span>
                    <span>{day.count} is</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div className="h-2 rounded-full bg-sky-500" style={{ width: `${Math.max(day.usage, day.count > 0 ? 8 : 0)}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="surface-panel" data-testid="operations-queue-panel">
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Atama ve Planlama Aciklari</p>
                <Badge variant="secondary">{attentionQueue.length}</Badge>
              </div>

              {attentionQueue.length === 0 ? (
                <p className="text-sm text-slate-400">Takip gerektiren acik is bulunmuyor.</p>
              ) : (
                <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
                  {attentionQueue.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      className="w-full rounded-lg border border-slate-700/70 bg-slate-900/50 p-3 text-left transition hover:border-sky-500/60"
                      onClick={() => router.push(`/servisler/${service.id}/duzenle`)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-medium text-slate-100">{service.tekneAdi}</p>
                        {isOverdue(service) ? (
                          <Badge className="bg-red-500/20 text-red-200">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Gecikme
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-700 text-slate-100">Izleme</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{service.yer || service.adres}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                        {!service.tarih && <span className="chip">Tarihsiz</span>}
                        {assignmentCount(service) === 0 && <span className="chip">Atanmamis</span>}
                        {service.tarih && <span className="chip">{formatDateLabel(service.tarih)}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="surface-panel" data-testid="operations-location-panel">
            <CardContent className="space-y-3 pt-4">
              <p className="text-sm font-semibold text-white">Lokasyon Dolulugu</p>
              {locationBreakdown.map((item) => (
                <div key={item.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-200">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{item.label}</span>
                    <span>{item.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-cyan-500"
                      style={{ width: `${summary.open > 0 ? Math.round((item.count / summary.open) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <MinimumRole minimumRole="YETKILI" fallback={<div />}>
        <Button type="button" size="lg" onClick={() => router.push('/servisler/yeni')} data-testid="operations-new-service">
          + Yeni Servis Ekle
        </Button>
      </MinimumRole>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5 text-sky-400" />
              {selectedService?.service.tekneAdi}
            </DialogTitle>
            <DialogDescription>Planlama detayi</DialogDescription>
          </DialogHeader>

          {selectedService && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-400">Tarih</span>
                  <p className="mt-1 text-sm font-medium text-slate-100">{selectedService.dateLabel}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Ekip</span>
                  <p className="mt-1 text-sm font-medium text-slate-100">{assignmentCount(selectedService.service)} kisi</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Lokasyon</span>
                  <p className="mt-1 text-sm font-medium text-slate-100">{selectedService.service.yer || selectedService.service.adres}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Durum</span>
                  <div className="mt-1">
                    <Badge style={{ backgroundColor: DURUM_CONFIG[selectedService.service.durum].bgColor, color: DURUM_CONFIG[selectedService.service.durum].color }}>
                      {DURUM_CONFIG[selectedService.service.durum].icon} {DURUM_CONFIG[selectedService.service.durum].label}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400">Aciklama</span>
                <p className="mt-1 text-sm text-slate-100">{selectedService.service.servisAciklamasi}</p>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDetailDialogOpen(false)}>
                  <X className="mr-1 h-4 w-4" />
                  Kapat
                </Button>
                <Button type="button" onClick={goToEditPage}>
                  <CheckCircle2 className="mr-1 h-4 w-4" />
                  Duzenlemeye Git
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dragDialogOpen} onOpenChange={setDragDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tarih Degisikligi Onayi</DialogTitle>
            <DialogDescription>Bu islem servis tarihini gunceller.</DialogDescription>
          </DialogHeader>

          {dragInfo && (
            <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Eski Tarih</span>
                <span>{formatDateLabel(dragInfo.oldDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Yeni Tarih</span>
                <span className="text-sky-300">{formatDateLabel(dragInfo.newDate)}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDragDialogOpen(false)}>
              Iptal
            </Button>
            <Button type="button" onClick={confirmDateChange}>
              Onayla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
