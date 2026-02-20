'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageEmptyState, PageErrorState, PageLoadingState } from '@/components/ui/page-states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PRICEBOOK_ITEM_TYPE_LABELS, type JobLineItemRecord, type JobTemplateRecord, type PricebookItemRecord } from '@/types/pricebook';

type EstimateTabProps = {
  jobId: string;
  initialLineItems: JobLineItemRecord[];
};

type JobLineItemsResponse = {
  lineItems: JobLineItemRecord[];
  subtotal: number;
};

type PricebookItemsResponse = {
  items: PricebookItemRecord[];
};

type TemplatesResponse = {
  templates: JobTemplateRecord[];
};

type LineItemDraft = {
  miktar: string;
  birimFiyat: string;
  notlar: string;
};

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

function toMoney(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function buildDraftMap(lineItems: JobLineItemRecord[]): Record<string, LineItemDraft> {
  const map: Record<string, LineItemDraft> = {};
  for (const item of lineItems) {
    map[item.id] = {
      miktar: String(item.miktar),
      birimFiyat: String(item.birimFiyat),
      notlar: item.notlar ?? '',
    };
  }
  return map;
}

export function EstimateTab({ jobId, initialLineItems }: EstimateTabProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lineItems, setLineItems] = useState<JobLineItemRecord[]>(initialLineItems);
  const [drafts, setDrafts] = useState<Record<string, LineItemDraft>>(buildDraftMap(initialLineItems));

  const [pricebookQuery, setPricebookQuery] = useState('');
  const [pricebookItems, setPricebookItems] = useState<PricebookItemRecord[]>([]);
  const [selectedPricebookItemId, setSelectedPricebookItemId] = useState('');
  const [newMiktar, setNewMiktar] = useState('1');
  const [newBirimFiyat, setNewBirimFiyat] = useState('');
  const [newNotlar, setNewNotlar] = useState('');

  const [templates, setTemplates] = useState<JobTemplateRecord[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [replaceWithTemplate, setReplaceWithTemplate] = useState(false);

  const subtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.toplam, 0),
    [lineItems]
  );

  const selectedPricebookItem = useMemo(
    () => pricebookItems.find((item) => item.id === selectedPricebookItemId) ?? null,
    [pricebookItems, selectedPricebookItemId]
  );

  useEffect(() => {
    if (!selectedPricebookItem) {
      return;
    }

    setNewBirimFiyat(
      selectedPricebookItem.varsayilanFiyat !== null ? String(selectedPricebookItem.varsayilanFiyat) : ''
    );
  }, [selectedPricebookItem]);

  const loadLineItems = useCallback(async (silent?: boolean) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}/line-items`, {
        cache: 'no-store',
        headers: getAuthHeaders(),
      });
      const payload = (await response.json().catch(() => null)) as JobLineItemsResponse | null;
      if (!response.ok) {
        throw new Error(parseError(payload, 'Line item listesi getirilemedi'));
      }

      const nextItems = payload?.lineItems ?? [];
      setLineItems(nextItems);
      setDrafts(buildDraftMap(nextItems));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Line item listesi getirilemedi');
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [jobId]);

  const loadTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/templates/jobs?aktif=true', {
        cache: 'no-store',
        headers: getAuthHeaders(),
      });
      const payload = (await response.json().catch(() => null)) as TemplatesResponse | null;
      if (!response.ok) {
        throw new Error(parseError(payload, 'Template listesi getirilemedi'));
      }

      setTemplates(payload?.templates ?? []);
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : 'Template listesi getirilemedi');
    }
  }, []);

  const loadPricebookItems = useCallback(async (query: string) => {
    try {
      const params = new URLSearchParams();
      params.set('aktif', 'true');
      if (query.trim()) {
        params.set('q', query.trim());
      }

      const response = await fetch(`/api/pricebook/items?${params.toString()}`, {
        cache: 'no-store',
        headers: getAuthHeaders(),
      });
      const payload = (await response.json().catch(() => null)) as PricebookItemsResponse | null;
      if (!response.ok) {
        throw new Error(parseError(payload, 'Pricebook item listesi getirilemedi'));
      }

      setPricebookItems(payload?.items ?? []);
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : 'Pricebook item listesi getirilemedi');
    }
  }, []);

  useEffect(() => {
    void loadLineItems();
    void loadTemplates();
  }, [loadLineItems, loadTemplates]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadPricebookItems(pricebookQuery);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [loadPricebookItems, pricebookQuery]);

  const handleAddLineItem = async () => {
    if (!selectedPricebookItemId) {
      toast.error('Line item eklemek icin pricebook kalemi seciniz');
      return;
    }

    const miktar = Number(newMiktar);
    if (!Number.isFinite(miktar) || miktar <= 0) {
      toast.error('Miktar sifirdan buyuk olmalidir');
      return;
    }

    const birimFiyat = newBirimFiyat.trim() ? Number(newBirimFiyat) : undefined;
    if (birimFiyat !== undefined && (!Number.isFinite(birimFiyat) || birimFiyat < 0)) {
      toast.error('Birim fiyat gecersiz');
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/line-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          pricebookItemId: selectedPricebookItemId,
          miktar,
          birimFiyat,
          notlar: newNotlar,
        }),
      });

      const payload = (await response.json().catch(() => null)) as JobLineItemRecord | null;
      if (!response.ok) {
        throw new Error(parseError(payload, 'Line item eklenemedi'));
      }

      if (payload) {
        const nextItems = [...lineItems, payload];
        setLineItems(nextItems);
        setDrafts(buildDraftMap(nextItems));
      }

      setNewMiktar('1');
      setNewBirimFiyat('');
      setNewNotlar('');
      toast.success('Line item eklendi');
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'Line item eklenemedi');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateLineItem = async (lineItem: JobLineItemRecord) => {
    const draft = drafts[lineItem.id];
    if (!draft) return;

    const miktar = Number(draft.miktar);
    const birimFiyat = Number(draft.birimFiyat);

    if (!Number.isFinite(miktar) || miktar <= 0) {
      toast.error('Miktar sifirdan buyuk olmalidir');
      return;
    }

    if (!Number.isFinite(birimFiyat) || birimFiyat < 0) {
      toast.error('Birim fiyat gecersiz');
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/line-items/${lineItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          miktar,
          birimFiyat,
          notlar: draft.notlar,
        }),
      });

      const payload = (await response.json().catch(() => null)) as JobLineItemRecord | null;
      if (!response.ok) {
        throw new Error(parseError(payload, 'Line item guncellenemedi'));
      }

      if (payload) {
        const nextItems = lineItems.map((item) => (item.id === payload.id ? payload : item));
        setLineItems(nextItems);
        setDrafts(buildDraftMap(nextItems));
      }

      toast.success('Line item guncellendi');
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'Line item guncellenemedi');
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveLineItem = async (lineItem: JobLineItemRecord) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/line-items/${lineItem.id}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders(),
        },
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(parseError(payload, 'Line item silinemedi'));
      }

      const nextItems = lineItems.filter((item) => item.id !== lineItem.id);
      setLineItems(nextItems);
      setDrafts(buildDraftMap(nextItems));
      toast.success('Line item silindi');
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'Line item silinemedi');
    } finally {
      setBusy(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplateId) {
      toast.error('Uygulamak icin template seciniz');
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/templates/jobs/${selectedTemplateId}/apply-to-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          jobId,
          replaceExisting: replaceWithTemplate,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            createdCount?: number;
            error?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(parseError(payload, 'Template uygulanamadi'));
      }

      toast.success(`Template uygulandi (${payload?.createdCount ?? 0} kalem)`);
      await loadLineItems(true);
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'Template uygulanamadi');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <PageLoadingState label="Estimate line item listesi yukleniyor..." />;
  }

  if (error) {
    return <PageErrorState title="Estimate verisi yuklenemedi" description={error} onRetry={() => void loadLineItems()} />;
  }

  return (
    <section className="space-y-4" data-testid="estimate-tab">
      <div className="surface-panel space-y-4 p-4">
        <div className="grid gap-3 lg:grid-cols-[2fr_2fr_120px_140px_1fr_auto]">
          <div className="space-y-1 lg:col-span-2">
            <Label htmlFor="estimate-pricebook-search">Pricebook ara</Label>
            <Input
              id="estimate-pricebook-search"
              placeholder="Kod veya ad"
              value={pricebookQuery}
              onChange={(event) => setPricebookQuery(event.target.value)}
              data-testid="estimate-pricebook-search"
            />
          </div>
          <div className="space-y-1 lg:col-span-2">
            <Label htmlFor="estimate-pricebook-item">Kalem</Label>
            <select
              id="estimate-pricebook-item"
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={selectedPricebookItemId}
              onChange={(event) => setSelectedPricebookItemId(event.target.value)}
              data-testid="estimate-pricebook-item-select"
            >
              <option value="">Kalem seciniz</option>
              {pricebookItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.kod ? `${item.kod} - ` : ''}{item.ad} ({PRICEBOOK_ITEM_TYPE_LABELS[item.tip]})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="estimate-new-miktar">Miktar</Label>
            <Input
              id="estimate-new-miktar"
              type="number"
              min="0.001"
              step="0.001"
              value={newMiktar}
              onChange={(event) => setNewMiktar(event.target.value)}
              data-testid="estimate-new-miktar"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="estimate-new-birim-fiyat">Birim fiyat</Label>
            <Input
              id="estimate-new-birim-fiyat"
              type="number"
              min="0"
              step="0.01"
              value={newBirimFiyat}
              onChange={(event) => setNewBirimFiyat(event.target.value)}
              data-testid="estimate-new-birim-fiyat"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="estimate-new-notlar">Not</Label>
            <Input
              id="estimate-new-notlar"
              value={newNotlar}
              onChange={(event) => setNewNotlar(event.target.value)}
              placeholder="Opsiyonel"
              data-testid="estimate-new-notlar"
            />
          </div>
          <div className="flex items-end justify-end">
            <Button onClick={() => void handleAddLineItem()} disabled={busy} data-testid="estimate-add-line-item">
              Ekle
            </Button>
          </div>
        </div>

        <div className="grid gap-3 rounded-md border border-border/70 p-3 md:grid-cols-[2fr_auto_auto]">
          <div className="space-y-1">
            <Label htmlFor="estimate-template-select">Template uygula</Label>
            <select
              id="estimate-template-select"
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              data-testid="estimate-template-select"
            >
              <option value="">Template seciniz</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.ad} ({template.itemCount} kalem)
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input
              type="checkbox"
              checked={replaceWithTemplate}
              onChange={(event) => setReplaceWithTemplate(event.target.checked)}
              data-testid="estimate-template-replace"
            />
            Mevcut kalemleri sil
          </label>
          <div className="flex items-end justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleApplyTemplate()}
              disabled={busy}
              data-testid="estimate-apply-template"
            >
              Template uygula
            </Button>
          </div>
        </div>
      </div>

      <div className="surface-panel overflow-hidden p-4">
        {lineItems.length === 0 ? (
          <PageEmptyState
            title="Estimate kalemi bulunmuyor"
            description="Pricebook'tan kalem secerek ilk estimate satirini ekleyin."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kalem</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Miktar</TableHead>
                <TableHead>Birim Fiyat</TableHead>
                <TableHead>Toplam</TableHead>
                <TableHead>Not</TableHead>
                <TableHead className="text-right">Aksiyon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item) => (
                <TableRow key={item.id} data-testid={`estimate-line-item-row-${item.id}`}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{item.ad}</p>
                      <p className="text-xs text-muted-foreground">{item.pricebookItem?.kod ?? '-'}</p>
                    </div>
                  </TableCell>
                  <TableCell>{item.pricebookItem ? PRICEBOOK_ITEM_TYPE_LABELS[item.pricebookItem.tip] : '-'}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={drafts[item.id]?.miktar ?? String(item.miktar)}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [item.id]: {
                            ...(current[item.id] ?? {
                              miktar: String(item.miktar),
                              birimFiyat: String(item.birimFiyat),
                              notlar: item.notlar ?? '',
                            }),
                            miktar: event.target.value,
                          },
                        }))
                      }
                      data-testid={`estimate-line-item-miktar-${item.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={drafts[item.id]?.birimFiyat ?? String(item.birimFiyat)}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [item.id]: {
                            ...(current[item.id] ?? {
                              miktar: String(item.miktar),
                              birimFiyat: String(item.birimFiyat),
                              notlar: item.notlar ?? '',
                            }),
                            birimFiyat: event.target.value,
                          },
                        }))
                      }
                      data-testid={`estimate-line-item-fiyat-${item.id}`}
                    />
                  </TableCell>
                  <TableCell>{toMoney(item.toplam)}</TableCell>
                  <TableCell>
                    <Input
                      value={drafts[item.id]?.notlar ?? item.notlar ?? ''}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [item.id]: {
                            ...(current[item.id] ?? {
                              miktar: String(item.miktar),
                              birimFiyat: String(item.birimFiyat),
                              notlar: item.notlar ?? '',
                            }),
                            notlar: event.target.value,
                          },
                        }))
                      }
                      data-testid={`estimate-line-item-notlar-${item.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleUpdateLineItem(item)}
                        disabled={busy}
                        data-testid={`estimate-line-item-update-${item.id}`}
                      >
                        Guncelle
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => void handleRemoveLineItem(item)}
                        disabled={busy}
                        data-testid={`estimate-line-item-remove-${item.id}`}
                      >
                        Sil
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="mt-4 flex items-center justify-between rounded-md border border-border/70 px-3 py-2 text-sm" data-testid="estimate-subtotal">
          <span className="font-medium text-foreground">Ara toplam</span>
          <span className="font-semibold text-foreground">{toMoney(subtotal)}</span>
        </div>

        <div className="mt-3 flex justify-end">
          <Button type="button" variant="outline" onClick={() => void loadLineItems(true)} disabled={refreshing || busy}>
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Yenile
          </Button>
        </div>
      </div>
    </section>
  );
}

export default EstimateTab;
