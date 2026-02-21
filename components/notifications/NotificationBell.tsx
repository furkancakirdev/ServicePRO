'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDateTimeForUi } from '@/lib/timezone';
import type { NotificationRecord, NotificationSummary } from '@/types/alerts';

type NotificationsResponse = {
  notifications: NotificationRecord[];
  summary: NotificationSummary;
};

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

function defaultSummary(): NotificationSummary {
  return {
    totalCount: 0,
    unreadCount: 0,
    readCount: 0,
    archivedCount: 0,
  };
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [summary, setSummary] = useState<NotificationSummary>(defaultSummary());

  const unreadCount = summary.unreadCount;
  const hasUnread = unreadCount > 0;

  const visibleNotifications = useMemo(
    () => notifications.filter((item) => item.status !== 'ARSIV').slice(0, 8),
    [notifications]
  );

  const loadNotifications = useCallback(async (silent?: boolean) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch('/api/notifications?status=ALL&limit=20', {
        cache: 'no-store',
        headers: getAuthHeaders(),
      });
      const payload = (await response.json().catch(() => null)) as NotificationsResponse | null;
      if (!response.ok) {
        throw new Error(parseError(payload, 'Bildirimler getirilemedi'));
      }

      setNotifications(payload?.notifications ?? []);
      setSummary(payload?.summary ?? defaultSummary());
    } catch (error) {
      if (!silent) {
        toast.error(error instanceof Error ? error.message : 'Bildirimler getirilemedi');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();

    const interval = window.setInterval(() => {
      void loadNotifications(true);
    }, 45_000);

    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    if (!open) return;
    void loadNotifications(true);
  }, [open, loadNotifications]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      setBusy(true);
      try {
        const response = await fetch(`/api/notifications/${notificationId}/read`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
        });

        const payload = (await response.json().catch(() => null)) as NotificationRecord | null;
        if (!response.ok) {
          throw new Error(parseError(payload, 'Bildirim okundu yapılamadı'));
        }

        setNotifications((current) =>
          current.map((item) =>
            item.id === notificationId
              ? {
                  ...item,
                  status: 'OKUNDU',
                  readAt: payload?.readAt ?? item.readAt,
                }
              : item
          )
        );
        setSummary((current) => ({
          ...current,
          unreadCount: Math.max(0, current.unreadCount - 1),
          readCount: current.readCount + 1,
        }));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Bildirim okundu yapılamadı');
      } finally {
        setBusy(false);
      }
    },
    []
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
        throw new Error(parseError(payload, 'Tüm bildirimler okundu yapılamadı'));
      }

      setNotifications((current) =>
        current.map((item) =>
          item.status === 'YENI'
            ? {
                ...item,
                status: 'OKUNDU',
                readAt: new Date().toISOString(),
              }
            : item
        )
      );
      setSummary((current) => ({
        ...current,
        unreadCount: 0,
        readCount: current.readCount + (payload?.updatedCount ?? 0),
      }));
      toast.success('Tüm bildirimler okundu olarak işaretlendi');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Tüm bildirimler okundu yapılamadı');
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Bildirimler"
          data-testid="notification-bell-trigger"
        >
          <Bell className="h-5 w-5" />
          {hasUnread ? <span className="notification-badge">{unreadCount}</span> : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px]" data-testid="notification-bell-content">
        <DropdownMenuLabel className="flex items-center justify-between gap-3">
          <span>Bildirimler</span>
          {hasUnread ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void markAllRead()}
              disabled={busy}
              className="h-7 px-2 text-xs"
              data-testid="notification-bell-read-all"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Tümünü okundu yap
            </Button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {loading ? (
          <div className="flex items-center gap-2 px-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Bildirimler yükleniyor...
          </div>
        ) : visibleNotifications.length === 0 ? (
          <div className="px-2 py-4 text-sm text-muted-foreground">Yeni bildirim yok.</div>
        ) : (
          <div className="max-h-[340px] space-y-2 overflow-auto px-1 py-1">
            {visibleNotifications.map((item) => (
              <div
                key={item.id}
                className="rounded-md border border-border/70 bg-background/40 p-2"
                data-testid={`notification-bell-item-${item.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm ${item.status === 'YENI' ? 'font-semibold text-foreground' : 'text-foreground/85'}`}>
                    {item.baslik}
                  </p>
                  {item.status === 'YENI' ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px]"
                      onClick={() => void markAsRead(item.id)}
                      disabled={busy}
                    >
                      Okundu
                    </Button>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.mesaj}</p>
                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span>{formatDateTimeForUi(item.createdAt)}</span>
                  {item.actionUrl ? (
                    <Link href={item.actionUrl} className="text-primary hover:underline">
                      Aç
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/notifications" className="w-full">
            Bildirim merkezine git
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationBell;
