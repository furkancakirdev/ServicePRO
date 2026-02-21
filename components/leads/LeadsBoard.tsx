'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageEmptyState, PageErrorState, PageLoadingState } from '@/components/ui/page-states';
import { formatDateTimeForUi, toDateTimeInputInTimeZone } from '@/lib/timezone';
import type { LeadRecord, LeadStatus } from '@/types/call-booking';

type LeadListResponse = {
  leads: LeadRecord[];
};

const LEAD_STATUS_OPTIONS: Array<{ value: LeadStatus; label: string }> = [
  { value: 'YENI', label: 'Yeni' },
  { value: 'TAKIPTE', label: 'Takipte' },
  { value: 'TEKLIF_BEKLIYOR', label: 'Teklif Bekliyor' },
  { value: 'KAYBEDILDI', label: 'Kaybedildi' },
  { value: 'KAZANILDI', label: 'Kazanildi' },
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
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return {
    ad: '',
    telefon: '',
    konu: '',
    takipAt: toDateTimeInputInTimeZone(tomorrow),
    kaynak: 'phone',
    status: 'YENI' as LeadStatus,
  };
}

export function LeadsBoard() {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LeadStatus>('ALL');
  const [busyIds, setBusyIds] = useState<string[]>([]);

  const [createForm, setCreateForm] = useState(buildCreateDefaults());
  const [creating, setCreating] = useState(false);

  const busySet = useMemo(() => new Set(busyIds), [busyIds]);

  const setBusy = useCallback((leadId: string, busy: boolean) => {
    setBusyIds((current) => {
      const next = new Set(current);
      if (busy) {
        next.add(leadId);
      } else {
        next.delete(leadId);
      }
      return Array.from(next);
    });
  }, []);

  const loadLeads = useCallback(
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

        const response = await fetch(`/api/leads?${params.toString()}`, {
          cache: 'no-store',
          headers: getAuthHeaders(),
        });
        const payload = (await response.json().catch(() => null)) as LeadListResponse | null;
        if (!response.ok) {
          throw new Error(parseError(payload, 'Talep listesi getirilemedi'));
        }

        setLeads(payload?.leads ?? []);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Talep listesi getirilemedi');
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
      void loadLeads(!loading);
    }, loading ? 0 : 250);

    return () => window.clearTimeout(timeout);
  }, [loadLeads, loading]);

  const handleCreateLead = async () => {
    if (!createForm.ad.trim() && !createForm.telefon.trim()) {
      toast.error('En az ad veya telefon bilgisi gerekli');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(createForm),
      });
      const payload = (await response.json().catch(() => null)) as LeadRecord | null;
      if (!response.ok) {
        throw new Error(parseError(payload, 'Talep oluşturulamadı'));
      }

      if (payload) {
        setLeads((current) => [payload, ...current]);
      }
      setCreateForm(buildCreateDefaults());
      toast.success('Talep oluşturuldu');
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : 'Talep oluşturulamadı');
    } finally {
      setCreating(false);
    }
  };

  const updateLead = async (
    lead: LeadRecord,
    payload: Partial<Pick<LeadRecord, 'status' | 'takipAt'>>
  ) => {
    const previous = leads;
    setBusy(lead.id, true);
    setLeads((current) =>
      current.map((item) =>
        item.id === lead.id
          ? {
              ...item,
              ...payload,
            }
          : item
      )
    );

    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as LeadRecord | null;
      if (!response.ok) {
        setLeads(previous);
        throw new Error(parseError(data, 'Talep güncellenemedi'));
      }

      if (data) {
        setLeads((current) =>
          current.map((item) => (item.id === lead.id ? { ...item, ...data } : item))
        );
      }
      toast.success('Talep güncellendi');
    } catch (updateError) {
      toast.error(updateError instanceof Error ? updateError.message : 'Talep güncellenemedi');
    } finally {
      setBusy(lead.id, false);
    }
  };

  const handleConvertToJob = async (lead: LeadRecord) => {
    const previous = leads;
    setBusy(lead.id, true);
    setLeads((current) =>
      current.map((item) =>
        item.id === lead.id
          ? {
              ...item,
              status: 'KAZANILDI',
            }
          : item
      )
    );

    try {
      const response = await fetch(`/api/leads/${lead.id}/convert-to-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({}),
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            lead?: LeadRecord;
            job?: { id: string };
          }
        | null;

      if (!response.ok) {
        setLeads(previous);
        throw new Error(parseError(payload, 'Talep iş emrine dönüştürülemedi'));
      }

      if (payload?.lead) {
        setLeads((current) =>
          current.map((item) => (item.id === lead.id ? payload.lead! : item))
        );
      }

      toast.success('Talep iş emrine dönüştürüldü');
    } catch (convertError) {
      toast.error(convertError instanceof Error ? convertError.message : 'Talep iş emrine dönüştürülemedi');
    } finally {
      setBusy(lead.id, false);
    }
  };

  const groupedLeads = useMemo(() => {
    const map: Record<LeadStatus, LeadRecord[]> = {
      YENI: [],
      TAKIPTE: [],
      TEKLIF_BEKLIYOR: [],
      KAYBEDILDI: [],
      KAZANILDI: [],
    };

    for (const lead of leads) {
      map[lead.status].push(lead);
    }

    return map;
  }, [leads]);

  if (loading) {
    return <PageLoadingState label="Talep panosu yükleniyor..." />;
  }

  if (error) {
    return (
      <PageErrorState
        title="Talep verisi yüklenemedi"
        description={error}
        onRetry={() => void loadLeads()}
      />
    );
  }

  return (
    <section className="space-y-4" data-testid="leads-board">
      <div className="surface-panel space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="leads-search">Ara</Label>
            <Input
              id="leads-search"
              placeholder="Ad, telefon, email, konu"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Durum</Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'ALL' | LeadStatus)}>
              <SelectTrigger data-testid="leads-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tum durumlar</SelectItem>
                {LEAD_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end justify-end">
            <Button type="button" variant="outline" onClick={() => void loadLeads(true)} disabled={refreshing}>
              {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Yenile
            </Button>
          </div>
        </div>
      </div>

      <div className="surface-panel space-y-4 p-4" data-testid="leads-create-form">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Yeni Talep</h3>
        <div className="grid gap-3 lg:grid-cols-3">
          <Input
            placeholder="Ad"
            value={createForm.ad}
            onChange={(event) => setCreateForm((current) => ({ ...current, ad: event.target.value }))}
            data-testid="leads-create-ad"
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
            data-testid="leads-create-telefon"
          />
          <Input
            placeholder="Konu"
            value={createForm.konu}
            onChange={(event) => setCreateForm((current) => ({ ...current, konu: event.target.value }))}
            data-testid="leads-create-konu"
          />
          <Input
            type="datetime-local"
            value={createForm.takipAt}
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                takipAt: event.target.value,
              }))
            }
            data-testid="leads-create-takip"
          />
          <Select
            value={createForm.status}
            onValueChange={(value) =>
              setCreateForm((current) => ({
                ...current,
                status: value as LeadStatus,
              }))
            }
          >
            <SelectTrigger data-testid="leads-create-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-end justify-end">
            <Button onClick={() => void handleCreateLead()} disabled={creating} data-testid="leads-create-submit">
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Talep Oluştur
            </Button>
          </div>
        </div>
      </div>

      {leads.length === 0 ? (
        <PageEmptyState title="Talep kaydı yok" description="Yeni talep ekleyerek başlayın." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-5" data-testid="leads-pipeline">
          {LEAD_STATUS_OPTIONS.map((status) => (
            <Card key={status.value} className="surface-panel">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  {status.label} ({groupedLeads[status.value].length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {groupedLeads[status.value].length === 0 ? (
                  <p className="text-xs text-muted-foreground">Kayit yok</p>
                ) : (
                  groupedLeads[status.value].map((lead) => (
                    <div key={lead.id} className="space-y-2 rounded-md border border-border/70 p-3" data-testid={`lead-card-${lead.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{lead.ad ?? '-'}</p>
                          <p className="text-xs text-muted-foreground">{lead.telefon ?? '-'}</p>
                        </div>
                        {lead.overdue ? <Badge variant="destructive">Overdue</Badge> : null}
                      </div>

                      <p className="text-xs text-muted-foreground">{lead.konu ?? 'Konu yok'}</p>

                      <Select
                        value={lead.status}
                        onValueChange={(value) => void updateLead(lead, { status: value as LeadStatus })}
                        disabled={busySet.has(lead.id)}
                      >
                        <SelectTrigger data-testid={`lead-status-${lead.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEAD_STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="space-y-1">
                        <Label className="text-xs">Takip tarihi</Label>
                        <Input
                          type="datetime-local"
                          defaultValue={lead.takipAt ? toDateTimeInputInTimeZone(lead.takipAt) : ''}
                          onBlur={(event) => {
                            const value = event.target.value;
                            if (value === toDateTimeInputInTimeZone(lead.takipAt ?? '')) return;
                            void updateLead(lead, { takipAt: value || null });
                          }}
                          disabled={busySet.has(lead.id)}
                          data-testid={`lead-followup-${lead.id}`}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => void handleConvertToJob(lead)}
                          disabled={busySet.has(lead.id) || lead.status === 'KAZANILDI'}
                          data-testid={`lead-convert-job-${lead.id}`}
                        >
                          İş Emrine Dönüştür
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/talepler/${lead.id}`}>Detay</Link>
                        </Button>
                      </div>

                      <div className="text-[11px] text-muted-foreground">Olusturma: {formatDateTimeForUi(lead.createdAt)}</div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

export default LeadsBoard;
