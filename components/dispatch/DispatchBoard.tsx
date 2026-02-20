'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clock3, Loader2, TriangleAlert } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDateDdmmyyyShortMonth, toDateOnlyISO } from '@/lib/date-utils';
import { parseDateTimeInputInTimeZone, TR_TIME_ZONE } from '@/lib/timezone';
import ConflictDialog from './ConflictDialog';
import DispatchFilters from './DispatchFilters';
import DispatchToolbar from './DispatchToolbar';
import JobTray from './JobTray';
import TechnicianLane from './TechnicianLane';
import type {
  DispatchApiResponse,
  DispatchAppointment,
  DispatchFiltersState,
  DispatchPersonelOption,
  DispatchPreferenceDto,
  DispatchView,
} from './types';

type DictionariesResponse = {
  locations?: Array<{ key: string; label: string }>;
};

const DEFAULT_FILTERS: DispatchFiltersState = {
  konum: 'ALL',
  durum: 'ALL',
  confirmed: 'all',
  personelId: 'ALL',
};

function startOfWeekMonday(input: Date): Date {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  return date;
}

function addDays(input: Date, days: number): Date {
  const date = new Date(input);
  date.setDate(date.getDate() + days);
  return date;
}

function dayLabel(dayKey: string): string {
  const date = new Date(`${dayKey}T00:00:00`);
  return `${date.toLocaleDateString('tr-TR', { weekday: 'short' })} ${formatDateDdmmyyyShortMonth(dayKey)}`;
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function mapDurationMinutes(appointment: DispatchAppointment): number {
  return Math.max(
    30,
    Math.round(
      (new Date(appointment.bitisAt).getTime() - new Date(appointment.baslangicAt).getTime()) / 60000
    )
  );
}

function normalizeView(raw: string | null): DispatchView {
  if (String(raw ?? '').toLowerCase() === 'week') return 'week';
  return 'day';
}

function toIsoOrFallback(value: Date | null, fallback: string): string {
  return value ? value.toISOString() : fallback;
}

function sortAppointments(items: DispatchAppointment[]): DispatchAppointment[] {
  return [...items].sort((left, right) => {
    const startDiff =
      new Date(left.baslangicAt).getTime() - new Date(right.baslangicAt).getTime();
    if (startDiff !== 0) return startDiff;
    if (left.sira !== right.sira) return left.sira - right.sira;
    return left.id.localeCompare(right.id);
  });
}

function parseApiError(payload: unknown): { message: string; code?: string; conflict?: unknown } {
  if (!payload || typeof payload !== 'object') {
    return { message: 'Dispatch islemi basarisiz' };
  }
  const row = payload as { error?: string; code?: string; conflict?: unknown };
  return {
    message: row.error ?? 'Dispatch islemi basarisiz',
    code: row.code,
    conflict: row.conflict,
  };
}

export function DispatchBoard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryView = normalizeView(searchParams.get('view'));

  const [view, setView] = useState<DispatchView>(queryView);
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  const [filters, setFilters] = useState<DispatchFiltersState>(DEFAULT_FILTERS);
  const [traySearch, setTraySearch] = useState('');
  const [denseMode, setDenseMode] = useState(true);
  const [appointments, setAppointments] = useState<DispatchAppointment[]>([]);
  const [personeller, setPersoneller] = useState<DispatchPersonelOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<Array<{ key: string; label: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [detail, setDetail] = useState<DispatchAppointment | null>(null);
  const [dropTarget, setDropTarget] = useState<{ personelId: string; dayKey: string } | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictData, setConflictData] = useState<{
    id: string;
    servisId: string;
    baslangicAt: string;
    bitisAt: string;
    status: string;
    servis: { tekneAdi: string; servisAciklamasi: string };
  } | null>(null);

  const draggingAppointmentId = useRef<string | null>(null);
  const bootstrapDone = useRef(false);

  const visibleDays = useMemo(() => {
    if (view === 'day') {
      const key = toDateOnlyISO(anchorDate) ?? toDateOnlyISO(new Date())!;
      return [key];
    }
    const weekStart = startOfWeekMonday(anchorDate);
    return Array.from({ length: 7 }, (_, index) => toDateOnlyISO(addDays(weekStart, index))!).filter(
      Boolean
    );
  }, [anchorDate, view]);

  const rangeLabel = useMemo(() => {
    if (visibleDays.length === 1) {
      return dayLabel(visibleDays[0]);
    }
    return `${dayLabel(visibleDays[0])} - ${dayLabel(visibleDays[visibleDays.length - 1])}`;
  }, [visibleDays]);

  const busyIdSet = useMemo(() => new Set(busyIds), [busyIds]);

  const statusOptions = useMemo(() => {
    return Array.from(new Set(appointments.map((item) => item.status))).sort((a, b) =>
      a.localeCompare(b, 'tr')
    );
  }, [appointments]);

  const visiblePersoneller = useMemo(() => {
    const base = [...personeller];
    if (filters.personelId !== 'ALL') {
      return base.filter((item) => item.id === filters.personelId);
    }
    return base;
  }, [filters.personelId, personeller]);

  const appointmentMapByPersonelAndDay = useMemo(() => {
    const map = new Map<string, DispatchAppointment[]>();
    for (const appointment of appointments) {
      if (!appointment.personelId) continue;
      const dayKey = toDateOnlyISO(appointment.baslangicAt);
      if (!dayKey) continue;
      if (!visibleDays.includes(dayKey)) continue;
      const key = `${appointment.personelId}__${dayKey}`;
      const current = map.get(key) ?? [];
      current.push(appointment);
      map.set(key, sortAppointments(current));
    }
    return map;
  }, [appointments, visibleDays]);

  const trayItems = useMemo(() => {
    const q = traySearch.trim().toLocaleLowerCase('tr-TR');
    return sortAppointments(
      appointments
        .filter((item) => !item.personelId)
        .filter((item) => {
          if (!q) return true;
          const haystack = `${item.job.tekneAdi} ${item.job.servisAciklamasi} ${item.job.yer}`.toLocaleLowerCase(
            'tr-TR'
          );
          return haystack.includes(q);
        })
    );
  }, [appointments, traySearch]);

  const capacityWarnings = useMemo(() => {
    let count = 0;
    for (const personel of visiblePersoneller) {
      for (const dayKey of visibleDays) {
        const items = appointmentMapByPersonelAndDay.get(`${personel.id}__${dayKey}`) ?? [];
        const total = items.reduce((sum, item) => sum + mapDurationMinutes(item), 0);
        if (total > 8 * 60) {
          count += 1;
        }
      }
    }
    return count;
  }, [appointmentMapByPersonelAndDay, visibleDays, visiblePersoneller]);

  const syncPreference = useCallback(
    async (next: { view?: DispatchView; yogunMod?: boolean; shownPersonelIds?: string[] }) => {
      try {
        const response = await fetch('/api/dispatch/preferences', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            view: next.view ? next.view.toUpperCase() : undefined,
            yogunMod: next.yogunMod,
            shownPersonelIds: next.shownPersonelIds,
          }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const parsed = parseApiError(payload);
          throw new Error(parsed.message);
        }
      } catch (prefError) {
        toast.error(
          prefError instanceof Error ? prefError.message : 'Dispatch tercihleri kaydedilemedi'
        );
      }
    },
    []
  );

  const loadStaticData = useCallback(async () => {
    const authHeaders = getAuthHeaders();
    const [personelRes, dictionaryRes, preferenceRes] = await Promise.all([
      fetch('/api/personel?aktif=true', { cache: 'no-store', headers: authHeaders }),
      fetch('/api/dictionaries/work-order', { cache: 'no-store', headers: authHeaders }).catch(
        () => null
      ),
      fetch('/api/dispatch/preferences', { cache: 'no-store', headers: authHeaders }).catch(
        () => null
      ),
    ]);

    if (!personelRes.ok) {
      throw new Error('Teknisyen listesi alinamadi');
    }

    const personelPayload = (await personelRes.json()) as DispatchPersonelOption[];
    const normalizedPersoneller = personelPayload
        .filter((item) => item.id && item.ad)
        .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
    setPersoneller(normalizedPersoneller);

    if (dictionaryRes?.ok) {
      const dictPayload = (await dictionaryRes.json()) as DictionariesResponse;
      setLocationOptions(
        (dictPayload.locations ?? []).map((item) => ({
          key: item.key,
          label: item.label,
        }))
      );
    }

    if (preferenceRes?.ok) {
      const preference = (await preferenceRes.json()) as DispatchPreferenceDto;
      setDenseMode(preference.yogunMod);
      const prefView = preference.view === 'WEEK' ? 'week' : 'day';
      if (!searchParams.get('view')) {
        setView(prefView);
      }
      const preferredVisible = preference.shownPersonelIds.filter((id) =>
        normalizedPersoneller.some((personel) => personel.id === id)
      );
      if (preferredVisible.length === 1) {
        setFilters((current) => ({
          ...current,
          personelId: preferredVisible[0],
        }));
      }
    }
  }, [searchParams]);

  const loadDispatch = useCallback(
    async (silent?: boolean) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const params = new URLSearchParams();
        if (view === 'day') {
          params.set('date', visibleDays[0]);
        } else {
          params.set('start', visibleDays[0]);
        }

        if (filters.konum !== 'ALL') params.set('konum', filters.konum);
        if (filters.durum !== 'ALL') params.set('durum', filters.durum);
        if (filters.confirmed !== 'all') params.set('confirmed', filters.confirmed);
        if (filters.personelId !== 'ALL') params.set('personelId', filters.personelId);

        const endpoint =
          view === 'day'
            ? `/api/dispatch/day?${params.toString()}`
            : `/api/dispatch/week?${params.toString()}`;

        const response = await fetch(endpoint, {
          cache: 'no-store',
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const parsed = parseApiError(payload);
          throw new Error(parsed.message);
        }

        const payload = (await response.json()) as DispatchApiResponse;
        setAppointments(sortAppointments(payload.appointments ?? []));
        setError(null);
      } catch (dispatchError) {
        setError(dispatchError instanceof Error ? dispatchError.message : 'Dispatch verisi alinamadi');
      } finally {
        if (silent) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [filters.confirmed, filters.durum, filters.konum, filters.personelId, view, visibleDays]
  );

  useEffect(() => {
    if (bootstrapDone.current) return;
    bootstrapDone.current = true;

    void (async () => {
      setLoading(true);
      try {
        await loadStaticData();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Dispatch yuklenemedi');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadStaticData]);

  useEffect(() => {
    void loadDispatch(!loading);
  }, [loadDispatch, loading]);

  const updateViewQuery = useCallback(
    (nextView: DispatchView) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set('view', nextView);
      router.replace(`${pathname}?${nextParams.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const setBusy = useCallback((appointmentId: string, busy: boolean) => {
    setBusyIds((current) => {
      const next = new Set(current);
      if (busy) {
        next.add(appointmentId);
      } else {
        next.delete(appointmentId);
      }
      return Array.from(next);
    });
  }, []);

  const applyMove = useCallback(
    async (
      appointment: DispatchAppointment,
      next: {
        personelId: string | null;
        baslangicAt: string;
        bitisAt: string;
      }
    ) => {
      const previous = appointments;
      const optimistic = sortAppointments(
        appointments.map((item) =>
          item.id === appointment.id
            ? {
                ...item,
                personelId: next.personelId,
                personelAd:
                  personeller.find((personel) => personel.id === next.personelId)?.ad ?? null,
                baslangicAt: next.baslangicAt,
                bitisAt: next.bitisAt,
              }
            : item
        )
      );

      setAppointments(optimistic);
      setBusy(appointment.id, true);

      try {
        const response = await fetch('/api/dispatch/move', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            appointmentId: appointment.id,
            personelId: next.personelId,
            baslangicAt: next.baslangicAt,
            bitisAt: next.bitisAt,
            optimisticLockVersion: appointment.updatedAt,
          }),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          const parsed = parseApiError(payload);
          setAppointments(previous);
          if (parsed.code === 'APPOINTMENT_OVERLAP' && parsed.conflict && typeof parsed.conflict === 'object') {
            const conflict = parsed.conflict as {
              id: string;
              servisId: string;
              baslangicAt: string;
              bitisAt: string;
              status: string;
              servis: { tekneAdi: string; servisAciklamasi: string };
            };
            setConflictData(conflict);
            setConflictOpen(true);
          }
          toast.error(parsed.message);
          return;
        }

        const updated = payload as DispatchAppointment;
        setAppointments((current) =>
          sortAppointments(current.map((item) => (item.id === updated.id ? updated : item)))
        );
        toast.success('Appointment guncellendi');
      } catch (moveError) {
        setAppointments(previous);
        toast.error(moveError instanceof Error ? moveError.message : 'Dispatch move basarisiz');
      } finally {
        setBusy(appointment.id, false);
      }
    },
    [appointments, personeller, setBusy]
  );

  const handleResize = useCallback(
    (appointment: DispatchAppointment, deltaMinutes: number) => {
      if (appointment.kilitli) {
        toast.error('Kilitli appointment resize edilemez');
        return;
      }
      const start = new Date(appointment.baslangicAt);
      const end = new Date(appointment.bitisAt);
      const nextEnd = new Date(end.getTime() + deltaMinutes * 60_000);
      if (nextEnd <= start) {
        toast.error('Minimum sure 30 dakikadir');
        return;
      }
      void applyMove(appointment, {
        personelId: appointment.personelId,
        baslangicAt: start.toISOString(),
        bitisAt: nextEnd.toISOString(),
      });
    },
    [applyMove]
  );

  const handleToggleLock = useCallback(
    async (appointment: DispatchAppointment) => {
      const lock = !appointment.kilitli;
      setBusy(appointment.id, true);
      try {
        const response = await fetch(lock ? '/api/dispatch/lock' : '/api/dispatch/unlock', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            appointmentId: appointment.id,
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          const parsed = parseApiError(payload);
          toast.error(parsed.message);
          return;
        }
        const updated = payload as DispatchAppointment;
        setAppointments((current) =>
          sortAppointments(current.map((item) => (item.id === updated.id ? updated : item)))
        );
        toast.success(lock ? 'Appointment kilitlendi' : 'Appointment kilidi acildi');
      } catch (lockError) {
        toast.error(lockError instanceof Error ? lockError.message : 'Lock islemi basarisiz');
      } finally {
        setBusy(appointment.id, false);
      }
    },
    [setBusy]
  );

  const handleCellDrop = useCallback(
    (personelId: string, dayKey: string, appointmentIdFromData: string | null) => {
      const appointmentId = appointmentIdFromData ?? draggingAppointmentId.current;
      draggingAppointmentId.current = null;
      setDropTarget(null);
      if (!appointmentId) return;

      const appointment = appointments.find((item) => item.id === appointmentId);
      if (!appointment) return;
      if (appointment.kilitli) {
        toast.error('Kilitli appointment tasinamaz');
        return;
      }

      const currentStart = new Date(appointment.baslangicAt);
      const currentMinutes = mapDurationMinutes(appointment);
      const localHour = currentStart.toLocaleString('sv-SE', {
        timeZone: TR_TIME_ZONE,
        hour: '2-digit',
        hour12: false,
      });
      const localMinute = currentStart.toLocaleString('sv-SE', {
        timeZone: TR_TIME_ZONE,
        minute: '2-digit',
        hour12: false,
      });
      const startCandidate = parseDateTimeInputInTimeZone(
        `${dayKey}T${localHour}:${localMinute}`,
        TR_TIME_ZONE
      );
      const nextStartIso = toIsoOrFallback(startCandidate, appointment.baslangicAt);
      const nextEndIso = new Date(
        new Date(nextStartIso).getTime() + currentMinutes * 60_000
      ).toISOString();

      void applyMove(appointment, {
        personelId,
        baslangicAt: nextStartIso,
        bitisAt: nextEndIso,
      });
    },
    [appointments, applyMove]
  );

  if (loading) {
    return (
      <section className="surface-panel p-6">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Dispatch board yukleniyor...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="surface-panel space-y-3 p-6">
        <p className="text-sm text-destructive">{error}</p>
        <Button onClick={() => void loadDispatch()}>Tekrar Dene</Button>
      </section>
    );
  }

  return (
    <section className="space-y-4" data-testid="dispatch-board">
      <div className="surface-panel space-y-3 p-4">
        <DispatchToolbar
          view={view}
          rangeLabel={rangeLabel}
          dense={denseMode}
          refreshing={refreshing}
          onViewChange={(nextView) => {
            setView(nextView);
            updateViewQuery(nextView);
            void syncPreference({
              view: nextView,
            });
          }}
          onPrev={() => setAnchorDate((current) => addDays(current, view === 'week' ? -7 : -1))}
          onNext={() => setAnchorDate((current) => addDays(current, view === 'week' ? 7 : 1))}
          onToday={() => setAnchorDate(new Date())}
          onRefresh={() => void loadDispatch(true)}
          onDenseToggle={() => {
            const nextDense = !denseMode;
            setDenseMode(nextDense);
            void syncPreference({ yogunMod: nextDense });
          }}
        />

        <DispatchFilters
          filters={filters}
          onChange={(next) => {
            setFilters(next);
            if (next.personelId !== filters.personelId) {
              void syncPreference({
                shownPersonelIds: next.personelId === 'ALL' ? [] : [next.personelId],
              });
            }
          }}
          locationOptions={locationOptions}
          statusOptions={statusOptions}
          personeller={personeller}
        />

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="chip">Appointments: {appointments.length}</span>
          <span className="chip">Unassigned: {trayItems.length}</span>
          <span className="chip">Timezone: {TR_TIME_ZONE}</span>
          {capacityWarnings > 0 ? (
            <span className="chip text-amber-500">
              <TriangleAlert className="h-3.5 w-3.5" />
              Capacity warning: {capacityWarnings} lane-day
            </span>
          ) : (
            <span className="chip">Capacity: normal</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <JobTray
          items={trayItems}
          search={traySearch}
          onSearchChange={setTraySearch}
          onDragStart={(appointmentId) => {
            draggingAppointmentId.current = appointmentId;
          }}
          onOpenDetail={setDetail}
        />

        <div className="surface-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40">
                  <th className="w-48 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Technician
                  </th>
                  {visibleDays.map((dayKey) => (
                    <th
                      key={dayKey}
                      className="min-w-[220px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {dayLabel(dayKey)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visiblePersoneller.map((personel) => {
                  const byDay: Record<string, DispatchAppointment[]> = {};
                  for (const dayKey of visibleDays) {
                    byDay[dayKey] = appointmentMapByPersonelAndDay.get(`${personel.id}__${dayKey}`) ?? [];
                  }
                  return (
                    <TechnicianLane
                      key={personel.id}
                      technician={{ id: personel.id, label: personel.ad }}
                      days={visibleDays}
                      appointmentsByDay={byDay}
                      dense={denseMode}
                      busyAppointmentIds={busyIdSet}
                      dropTarget={dropTarget}
                      onCardDragStart={(appointmentId) => {
                        draggingAppointmentId.current = appointmentId;
                      }}
                      onOpenDetail={setDetail}
                      onResize={handleResize}
                      onToggleLock={handleToggleLock}
                      onCellDragOver={(personelId, dayKey) => setDropTarget({ personelId, dayKey })}
                      onCellDragLeave={(personelId, dayKey) => {
                        setDropTarget((current) =>
                          current?.personelId === personelId && current.dayKey === dayKey ? null : current
                        );
                      }}
                      onCellDrop={handleCellDrop}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={Boolean(detail)} onOpenChange={(open) => (!open ? setDetail(null) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detail?.job.tekneAdi ?? 'Appointment'}</DialogTitle>
            <DialogDescription>Dispatch hizli detay</DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-border/70 p-3">
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="mt-1 font-medium text-foreground">
                    {new Date(detail.baslangicAt).toLocaleString('tr-TR', { timeZone: TR_TIME_ZONE })} -{' '}
                    {new Date(detail.bitisAt).toLocaleString('tr-TR', { timeZone: TR_TIME_ZONE })}
                  </p>
                </div>
                <div className="rounded-md border border-border/70 p-3">
                  <p className="text-xs text-muted-foreground">Teknisyen</p>
                  <p className="mt-1 font-medium text-foreground">{detail.personelAd ?? 'Atanmamis'}</p>
                </div>
              </div>
              <div className="rounded-md border border-border/70 p-3">
                <p className="text-xs text-muted-foreground">Aciklama</p>
                <p className="mt-1 text-foreground">{detail.job.servisAciklamasi}</p>
              </div>
            </div>
          ) : null}
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setDetail(null)}>
              Kapat
            </Button>
            {detail ? (
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link href={`/jobs/${detail.servisId}`}>
                    <Clock3 className="mr-1 h-4 w-4" />
                    Job Detay
                  </Link>
                </Button>
              </div>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConflictDialog
        open={conflictOpen}
        conflict={conflictData}
        onClose={() => {
          setConflictOpen(false);
          setConflictData(null);
        }}
      />
    </section>
  );
}

export default DispatchBoard;
