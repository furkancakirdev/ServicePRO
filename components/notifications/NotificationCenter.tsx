'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageEmptyState, PageErrorState, PageLoadingState } from '@/components/ui/page-states';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTimeForUi } from '@/lib/timezone';
import type {
  NotificationRecord,
  NotificationStatusValue,
  NotificationSummary,
} from '@/types/alerts';

type NotificationFilter = 'ALL' | NotificationStatusValue;

type NotificationsResponse = {
  notifications: NotificationRecord[];
  summary: NotificationSummary;
};

const STATUS_OPTIONS: Array<{ value: NotificationFilter; label: string }> = [
  { value: 'ALL', label: 'Tum bildirimler' },
  { value: 'YENI', label: 'Yeni' },
  { value: 'OKUNDU', label: 'Okundu' },
  { value: 'ARSIV', label: 'Arsiv' },
];

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function parseError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const record = payload as { error?: string };
  return record.error ?? fallback;
}

function emptySummary(): NotificationSummary {
  return {
    totalCount: 0,
    unreadCount: 0,
    readCount: 0,
    archivedCount: 0,
  };
}

function statusBadgeVariant(status: NotificationStatusValue): 'default' | 'secondary' | 'outline' {
  if (status === 'YENI') return 'default';
  if (status === 'OKUNDU') return 'secondary';
  return 'outline';
}

export function NotificationCenter() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<NotificationFilter>('ALL');
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [summary, setSummary] = useState<NotificationSummary>(emptySummary());

  const sorted = useMemo(
    () =>
      [...notifications].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      ),
    [notifications]
  );

  const loadNotifications = useCallback(
    async (silent?: boolean) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await fetch(`/api/notifications?status=${statusFilter}&limit=200`, {
          cache: 'no-store',
          headers: getAuthHeaders(),
        });
        const payload = (await response.json().catch(() => null)) as NotificationsResponse | null;
        if (!response.ok) {
          throw new Error(parseError(payload, 'Bildirimler getirilemedi'));
        }

        setNotifications(payload?.notifications ?? []);
        setSummary(payload?.summary ?? emptySummary());
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Bildirimler getirilemedi');
      } finally {
        if (silent) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [statusFilter]
  );

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const updateNotification = useCallback((notificationId: string, patch: Partial<NotificationRecord>) => {
    setNotifications((current) =>
      current.map((item) => (item.id === notificationId ? { ...item, ...patch } : item))
    );
  }, []);

  const markAsRead = useCallback(
    async (notification: NotificationRecord) => {
      if (notification.status !== 'YENI') return;
      setBusy(true);
      try {
        const response = await fetch(`/api/notifications/${notification.id}/read`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
        });
        const payload = (await response.json().catch(() => null)) as NotificationRecord | null;
        if (!response.ok) {
          throw new Error(parseError(payload, 'Bildirim okundu yapilamadi'));
        }

        updateNotification(notification.id, {
          status: 'OKUNDU',
          readAt: payload?.readAt ?? new Date().toISOString(),
        });
        setSummary((current) => ({
          ...current,
          unreadCount: Math.max(0, current.unreadCount - 1),
          readCount: current.readCount + 1,
        }));
      } catch (actionError) {
        toast.error(actionError instanceof Error ? actionError.message : 'Bildirim okundu yapilamadi');
      } finally {
        setBusy(false);
      }
    },
    [updateNotification]
  );

  const archive = useCallback(
    async (notification: NotificationRecord) => {
      setBusy(true);
      try {
        const response = await fetch(`/api/notifications/${notification.id}/archive`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
        });
        const payload = (await response.json().catch(() => null)) as NotificationRecord | null;
        if (!response.ok) {
          throw new Error(parseError(payload, 'Bildirim arsivlenemedi'));
        }

        updateNotification(notification.id, {
          status: 'ARSIV',
          readAt: payload?.readAt ?? notification.readAt ?? new Date().toISOString(),
        });

        if (notification.status === 'YENI') {
          setSummary((current) => ({
            ...current,
            unreadCount: Math.max(0, current.unreadCount - 1),
            archivedCount: current.archivedCount + 1,
          }));
        } else if (notification.status === 'OKUNDU') {
          setSummary((current) => ({
            ...current,
            readCount: Math.max(0, current.readCount - 1),
            archivedCount: current.archivedCount + 1,
          }));
        }
      } catch (actionError) {
        toast.error(actionError instanceof Error ? actionError.message : 'Bildirim arsivlenemedi');
      } finally {
        setBusy(false);
      }
    },
    [updateNotification]
  );

  const markAllRead = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });
      const payload = (await response.json().catch(() => null)) as { updatedCount?: number; error?: string } | null;
      if (!response.ok) {
        throw new Error(parseError(payload, 'Tum bildirimler okundu yapilamadi'));
      }

      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => (item.status === 'YENI' ? { ...item, status: 'OKUNDU', readAt } : item))
      );

      setSummary((current) => ({
        ...current,
        unreadCount: 0,
        readCount: current.readCount + (payload?.updatedCount ?? 0),
      }));
      toast.success('Tum bildirimler okundu olarak isaretlendi');
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'Tum bildirimler okundu yapilamadi');
    } finally {
      setBusy(false);
    }
  }, []);

  if (loading) {
    return <PageLoadingState label="Bildirimler yukleniyor..." />;
  }

  if (error) {
    return (
      <PageErrorState
        title="Bildirimler yuklenemedi"
        description={error}
        onRetry={() => void loadNotifications()}
      />
    );
  }

  return (
    <section className="space-y-4" data-testid="notifications-center">
      <div className="surface-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-2 md:grid-cols-4">
            <div className="rounded-md border border-border/70 px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground">Toplam</p>
              <p className="font-semibold text-foreground">{summary.totalCount}</p>
            </div>
            <div className="rounded-md border border-border/70 px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground">Yeni</p>
              <p className="font-semibold text-foreground">{summary.unreadCount}</p>
            </div>
            <div className="rounded-md border border-border/70 px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground">Okundu</p>
              <p className="font-semibold text-foreground">{summary.readCount}</p>
            </div>
            <div className="rounded-md border border-border/70 px-3 py-2 text-sm">
              <p className="text-xs text-muted-foreground">Arsiv</p>
              <p className="font-semibold text-foreground">{summary.archivedCount}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as NotificationFilter)}
            >
              <SelectTrigger className="w-[190px]" data-testid="notifications-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              onClick={() => void loadNotifications(true)}
              disabled={refreshing || busy}
              data-testid="notifications-refresh"
            >
              {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
              Yenile
            </Button>

            <Button
              type="button"
              onClick={() => void markAllRead()}
              disabled={busy || summary.unreadCount === 0}
              data-testid="notifications-read-all"
            >
              Tumunu okundu yap
            </Button>
          </div>
        </div>
      </div>

      <div className="surface-panel overflow-hidden p-4" data-testid="notifications-list">
        {sorted.length === 0 ? (
          <PageEmptyState
            title="Bildirim bulunmuyor"
            description="Yeni bir aksiyon olustugunda burada gorunecek."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Baslik</TableHead>
                <TableHead>Mesaj</TableHead>
                <TableHead>Aksiyon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((item) => (
                <TableRow key={item.id} data-testid={`notification-row-${item.id}`}>
                  <TableCell>{formatDateTimeForUi(item.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(item.status)}>{item.status}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{item.baslik}</TableCell>
                  <TableCell className="max-w-[480px] text-sm text-muted-foreground">{item.mesaj}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void markAsRead(item)}
                        disabled={busy || item.status !== 'YENI'}
                        data-testid={`notification-read-${item.id}`}
                      >
                        Okundu
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void archive(item)}
                        disabled={busy || item.status === 'ARSIV'}
                        data-testid={`notification-archive-${item.id}`}
                      >
                        Arsivle
                      </Button>
                      {item.actionUrl ? (
                        <Button asChild size="sm" variant="secondary">
                          <Link href={item.actionUrl}>Kaydi Ac</Link>
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

export default NotificationCenter;
