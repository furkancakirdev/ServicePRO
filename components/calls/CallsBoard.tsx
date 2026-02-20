'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageEmptyState, PageErrorState, PageLoadingState } from '@/components/ui/page-states';
import { formatDateTimeForUi, toDateTimeInputInTimeZone } from '@/lib/timezone';
import type { BookingRecord, BookingStatus } from '@/types/call-booking';

type BookingListResponse = {
  bookings: BookingRecord[];
};

type ConvertToJobResponse = {
  booking: BookingRecord;
  job: {
    id: string;
  };
};

const BOOKING_STATUS_OPTIONS: Array<{ value: BookingStatus; label: string }> = [
  { value: 'YENI', label: 'Yeni' },
  { value: 'ISLEMDE', label: 'Islemde' },
  { value: 'JOB_OLUSTURULDU', label: 'Job Olusturuldu' },
  { value: 'LEAD_OLUSTURULDU', label: 'Lead Olusturuldu' },
  { value: 'REDDEDILDI', label: 'Reddedildi' },
];

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function parseError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const row = payload as { error?: string };
  return row.error ?? fallback;
}

function buildCreateDefaults() {
  const now = new Date();
  return {
    arayanAd: '',
    telefon: '',
    tekneAd: '',
    konu: '',
    tercihTarih: toDateTimeInputInTimeZone(now),
    tercihSaatAraligi: '09:00-12:00',
    kaynak: 'phone',
  };
}

export function CallsBoard() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | BookingStatus>('ALL');
  const [busyIds, setBusyIds] = useState<string[]>([]);

  const [createForm, setCreateForm] = useState(buildCreateDefaults());
  const [creating, setCreating] = useState(false);

  const busySet = useMemo(() => new Set(busyIds), [busyIds]);

  const setBusy = useCallback((bookingId: string, busy: boolean) => {
    setBusyIds((current) => {
      const next = new Set(current);
      if (busy) {
        next.add(bookingId);
      } else {
        next.delete(bookingId);
      }
      return Array.from(next);
    });
  }, []);

  const loadBookings = useCallback(
    async (silent?: boolean) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set('q', search.trim());
        if (statusFilter !== 'ALL') params.set('status', statusFilter);

        const response = await fetch(`/api/bookings?${params.toString()}`, {
          cache: 'no-store',
          headers: getAuthHeaders(),
        });
        const payload = (await response.json().catch(() => null)) as BookingListResponse | null;
        if (!response.ok) {
          throw new Error(parseError(payload, 'Booking listesi getirilemedi'));
        }

        setBookings(payload?.bookings ?? []);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Booking listesi getirilemedi');
      } finally {
        if (silent) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [search, statusFilter]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadBookings(!loading);
    }, loading ? 0 : 250);

    return () => window.clearTimeout(timeout);
  }, [loadBookings, loading]);

  const handleCreateBooking = async () => {
    if (!createForm.telefon.trim() && !createForm.arayanAd.trim()) {
      toast.error('En az arayan adi veya telefon bilgisi gerekli');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          kaynak: createForm.kaynak,
          arayanAd: createForm.arayanAd,
          telefon: createForm.telefon,
          tekneAd: createForm.tekneAd,
          konu: createForm.konu,
          tercihTarih: createForm.tercihTarih,
          tercihSaatAraligi: createForm.tercihSaatAraligi,
          status: 'YENI',
        }),
      });
      const payload = (await response.json().catch(() => null)) as BookingRecord | null;

      if (!response.ok) {
        throw new Error(parseError(payload, 'Booking olusturulamadi'));
      }

      if (payload) {
        setBookings((current) => [payload, ...current]);
      }
      setCreateForm(buildCreateDefaults());
      toast.success('Booking olusturuldu');
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : 'Booking olusturulamadi');
    } finally {
      setCreating(false);
    }
  };

  const handleConvertToJob = async (booking: BookingRecord) => {
    const previous = bookings;
    setBusy(booking.id, true);
    setBookings((current) =>
      current.map((item) =>
        item.id === booking.id
          ? {
              ...item,
              status: 'JOB_OLUSTURULDU',
            }
          : item
      )
    );

    try {
      const response = await fetch(`/api/bookings/${booking.id}/convert-to-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({}),
      });
      const payload = (await response.json().catch(() => null)) as ConvertToJobResponse | null;

      if (!response.ok) {
        setBookings(previous);
        throw new Error(parseError(payload, 'Booking joba donusturulemedi'));
      }

      if (payload?.booking) {
        setBookings((current) =>
          current.map((item) => (item.id === booking.id ? payload.booking : item))
        );
      }

      toast.success('Booking joba donusturuldu');
    } catch (convertError) {
      toast.error(convertError instanceof Error ? convertError.message : 'Booking joba donusturulemedi');
    } finally {
      setBusy(booking.id, false);
    }
  };

  const handleConvertToLead = async (booking: BookingRecord) => {
    const previous = bookings;
    setBusy(booking.id, true);
    setBookings((current) =>
      current.map((item) =>
        item.id === booking.id
          ? {
              ...item,
              status: 'LEAD_OLUSTURULDU',
            }
          : item
      )
    );

    try {
      const response = await fetch(`/api/bookings/${booking.id}/convert-to-lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({}),
      });
      const payload = (await response.json().catch(() => null)) as { booking?: BookingRecord } | null;
      if (!response.ok) {
        setBookings(previous);
        throw new Error(parseError(payload, 'Booking leade donusturulemedi'));
      }

      if (payload?.booking) {
        setBookings((current) =>
          current.map((item) => (item.id === booking.id ? payload.booking! : item))
        );
      }
      toast.success('Booking leade donusturuldu');
    } catch (convertError) {
      toast.error(convertError instanceof Error ? convertError.message : 'Booking leade donusturulemedi');
    } finally {
      setBusy(booking.id, false);
    }
  };

  const handleDismiss = async (booking: BookingRecord) => {
    const previous = bookings;
    setBusy(booking.id, true);
    setBookings((current) =>
      current.map((item) =>
        item.id === booking.id
          ? {
              ...item,
              status: 'REDDEDILDI',
            }
          : item
      )
    );

    try {
      const response = await fetch(`/api/bookings/${booking.id}/dismiss`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ reason: 'CSR reddi' }),
      });

      const payload = (await response.json().catch(() => null)) as BookingRecord | null;
      if (!response.ok) {
        setBookings(previous);
        throw new Error(parseError(payload, 'Booking reddedilemedi'));
      }

      if (payload) {
        setBookings((current) =>
          current.map((item) => (item.id === booking.id ? payload : item))
        );
      }
      toast.success('Booking reddedildi');
    } catch (dismissError) {
      toast.error(dismissError instanceof Error ? dismissError.message : 'Booking reddedilemedi');
    } finally {
      setBusy(booking.id, false);
    }
  };

  if (loading) {
    return <PageLoadingState label="Booking listesi yukleniyor..." />;
  }

  if (error) {
    return (
      <PageErrorState
        title="Booking verisi yuklenemedi"
        description={error}
        onRetry={() => void loadBookings()}
      />
    );
  }

  return (
    <section className="space-y-4" data-testid="calls-board">
      <div className="surface-panel space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="calls-search">Ara</Label>
            <Input
              id="calls-search"
              placeholder="Telefon, arayan, tekne, konu"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Durum</Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'ALL' | BookingStatus)}>
              <SelectTrigger data-testid="calls-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tum durumlar</SelectItem>
                {BOOKING_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end justify-end">
            <Button type="button" variant="outline" onClick={() => void loadBookings(true)} disabled={refreshing}>
              {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Yenile
            </Button>
          </div>
        </div>
      </div>

      <div className="surface-panel space-y-4 p-4" data-testid="calls-create-form">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Yeni Booking</h3>
        <div className="grid gap-3 lg:grid-cols-3">
          <Input
            placeholder="Arayan adi"
            value={createForm.arayanAd}
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                arayanAd: event.target.value,
              }))
            }
            data-testid="calls-create-arayan"
          />
          <Input
            placeholder="Telefon"
            value={createForm.telefon}
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                telefon: event.target.value,
              }))
            }
            data-testid="calls-create-telefon"
          />
          <Input
            placeholder="Tekne adi"
            value={createForm.tekneAd}
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                tekneAd: event.target.value,
              }))
            }
            data-testid="calls-create-tekne"
          />
          <Input
            placeholder="Konu"
            value={createForm.konu}
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                konu: event.target.value,
              }))
            }
            data-testid="calls-create-konu"
          />
          <Input
            type="datetime-local"
            value={createForm.tercihTarih}
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                tercihTarih: event.target.value,
              }))
            }
            data-testid="calls-create-tercih-tarih"
          />
          <Input
            placeholder="Saat araligi (09:00-12:00)"
            value={createForm.tercihSaatAraligi}
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                tercihSaatAraligi: event.target.value,
              }))
            }
            data-testid="calls-create-saat-araligi"
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={() => void handleCreateBooking()} disabled={creating} data-testid="calls-create-submit">
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Booking Olustur
          </Button>
        </div>
      </div>

      <div className="surface-panel overflow-hidden p-4" data-testid="calls-list">
        {bookings.length === 0 ? (
          <PageEmptyState title="Booking kaydi yok" description="Yeni booking olusturarak baslayin." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Arayan</TableHead>
                <TableHead>Tekne</TableHead>
                <TableHead>Konu</TableHead>
                <TableHead>Tercih</TableHead>
                <TableHead className="text-right">Aksiyon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id} data-testid={`booking-row-${booking.id}`}>
                  <TableCell>{formatDateTimeForUi(booking.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{booking.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{booking.arayanAd ?? '-'}</div>
                      <div className="text-xs text-muted-foreground">{booking.telefon ?? '-'}</div>
                    </div>
                  </TableCell>
                  <TableCell>{booking.tekneAd ?? '-'}</TableCell>
                  <TableCell className="max-w-[240px] truncate">{booking.konu ?? '-'}</TableCell>
                  <TableCell>
                    {booking.tercihTarih ? (
                      <div className="text-xs">
                        <div>{formatDateTimeForUi(booking.tercihTarih)}</div>
                        <div className="text-muted-foreground">{booking.tercihSaatAraligi ?? '-'}</div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleConvertToJob(booking)}
                        disabled={busySet.has(booking.id) || booking.status === 'JOB_OLUSTURULDU'}
                        data-testid={`booking-convert-job-${booking.id}`}
                      >
                        Joba Donustur
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleConvertToLead(booking)}
                        disabled={busySet.has(booking.id) || booking.status === 'LEAD_OLUSTURULDU'}
                        data-testid={`booking-convert-lead-${booking.id}`}
                      >
                        Leade Donustur
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => void handleDismiss(booking)}
                        disabled={busySet.has(booking.id) || booking.status === 'REDDEDILDI'}
                        data-testid={`booking-dismiss-${booking.id}`}
                      >
                        Reddet
                      </Button>
                      {booking.servisId ? (
                        <Button asChild size="sm" variant="secondary">
                          <Link href={`/jobs/${booking.servisId}`}>Job Ac</Link>
                        </Button>
                      ) : null}
                      {booking.leadId ? (
                        <Button asChild size="sm" variant="secondary">
                          <Link href={`/leads`}>Lead Listesi</Link>
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </section>
  );
}

export default CallsBoard;
