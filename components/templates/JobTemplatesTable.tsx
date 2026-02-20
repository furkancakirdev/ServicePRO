'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { TemplateBuilder, type TemplateBuilderItemInput } from '@/components/templates/TemplateBuilder';
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
import { Label } from '@/components/ui/label';
import { PageEmptyState, PageErrorState, PageLoadingState } from '@/components/ui/page-states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { JobTemplateRecord, PricebookItemRecord } from '@/types/pricebook';

type TemplatesResponse = {
  templates: JobTemplateRecord[];
};

type PricebookItemsResponse = {
  items: PricebookItemRecord[];
};

type TemplateDialogState = {
  ad: string;
  aciklama: string;
  defaultStatus: string;
  defaultNotlar: string;
  aktif: boolean;
  items: TemplateBuilderItemInput[];
};

function createDialogState(): TemplateDialogState {
  return {
    ad: '',
    aciklama: '',
    defaultStatus: 'RANDEVU_VERILDI',
    defaultNotlar: '',
    aktif: true,
    items: [],
  };
}

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

export function JobTemplatesTable() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [templates, setTemplates] = useState<JobTemplateRecord[]>([]);
  const [pricebookItems, setPricebookItems] = useState<PricebookItemRecord[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<JobTemplateRecord | null>(null);
  const [dialogState, setDialogState] = useState<TemplateDialogState>(createDialogState());

  const sortedTemplates = useMemo(
    () =>
      [...templates].sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      ),
    [templates]
  );

  const loadAll = useCallback(async (silent?: boolean) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [templatesRes, itemsRes] = await Promise.all([
        fetch('/api/templates/jobs', {
          cache: 'no-store',
          headers: getAuthHeaders(),
        }),
        fetch('/api/pricebook/items?aktif=true', {
          cache: 'no-store',
          headers: getAuthHeaders(),
        }),
      ]);

      const templatesBody = (await templatesRes.json().catch(() => null)) as TemplatesResponse | null;
      const itemsBody = (await itemsRes.json().catch(() => null)) as PricebookItemsResponse | null;

      if (!templatesRes.ok) {
        throw new Error(parseError(templatesBody, 'Template listesi getirilemedi'));
      }
      if (!itemsRes.ok) {
        throw new Error(parseError(itemsBody, 'Pricebook item listesi getirilemedi'));
      }

      setTemplates(templatesBody?.templates ?? []);
      setPricebookItems(itemsBody?.items ?? []);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Template verisi yuklenemedi');
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const openCreate = () => {
    setEditingTemplate(null);
    setDialogState(createDialogState());
    setDialogOpen(true);
  };

  const openEdit = (template: JobTemplateRecord) => {
    setEditingTemplate(template);
    setDialogState({
      ad: template.ad,
      aciklama: template.aciklama ?? '',
      defaultStatus: template.defaultStatus ?? 'RANDEVU_VERILDI',
      defaultNotlar: template.defaultNotlar ?? '',
      aktif: template.aktif,
      items: template.items.map((item, index) => ({
        clientId: item.id,
        pricebookItemId: item.pricebookItemId,
        ad: item.ad,
        miktar: String(item.miktar),
        birimFiyat: String(item.birimFiyat),
        sira: item.sira ?? index,
      })),
    });
    setDialogOpen(true);
  };

  const toggleActive = async (template: JobTemplateRecord) => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/templates/jobs/${template.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          aktif: !template.aktif,
        }),
      });

      const payload = (await response.json().catch(() => null)) as JobTemplateRecord | null;
      if (!response.ok) {
        throw new Error(parseError(payload, 'Template durumu guncellenemedi'));
      }

      setTemplates((current) => current.map((row) => (row.id === template.id ? payload! : row)));
      toast.success(template.aktif ? 'Template pasiflestirildi' : 'Template aktiflestirildi');
    } catch (toggleError) {
      toast.error(toggleError instanceof Error ? toggleError.message : 'Template durumu guncellenemedi');
    } finally {
      setSubmitting(false);
    }
  };

  const saveTemplate = async () => {
    const name = dialogState.ad.trim();
    if (!name) {
      toast.error('Template adi zorunludur');
      return;
    }

    const items = dialogState.items.map((item, index) => {
      const miktar = Number(item.miktar);
      const birimFiyat = Number(item.birimFiyat);

      if (!Number.isFinite(miktar) || miktar <= 0) {
        throw new Error('Template item miktari sifirdan buyuk olmalidir');
      }

      if (!Number.isFinite(birimFiyat) || birimFiyat < 0) {
        throw new Error('Template item birim fiyati gecersiz');
      }

      return {
        pricebookItemId: item.pricebookItemId,
        ad: item.ad,
        miktar,
        birimFiyat,
        sira: index,
      };
    });

    setSubmitting(true);
    try {
      const isEdit = Boolean(editingTemplate);
      const endpoint = isEdit ? `/api/templates/jobs/${editingTemplate!.id}` : '/api/templates/jobs';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          ad: name,
          aciklama: dialogState.aciklama.trim() || null,
          defaultStatus: dialogState.defaultStatus.trim() || null,
          defaultNotlar: dialogState.defaultNotlar.trim() || null,
          aktif: dialogState.aktif,
          items,
        }),
      });

      const payload = (await response.json().catch(() => null)) as JobTemplateRecord | null;
      if (!response.ok) {
        throw new Error(parseError(payload, isEdit ? 'Template guncellenemedi' : 'Template olusturulamadi'));
      }

      toast.success(isEdit ? 'Template guncellendi' : 'Template olusturuldu');
      setDialogOpen(false);
      setEditingTemplate(null);
      setDialogState(createDialogState());
      await loadAll(true);
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Template kaydedilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoadingState label="Job template listesi yukleniyor..." />;
  }

  if (error) {
    return (
      <PageErrorState
        title="Template verisi yuklenemedi"
        description={error}
        onRetry={() => void loadAll()}
      />
    );
  }

  return (
    <section className="space-y-4" data-testid="job-templates-table">
      <div className="surface-panel flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Job Templates</h3>
          <p className="text-sm text-muted-foreground">Sik kullanilan kalem setleri ile hizli estimate ve hizli job acilisi.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => void loadAll(true)} disabled={refreshing || submitting}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Yenile
          </Button>
          <Button type="button" onClick={openCreate} disabled={submitting} data-testid="job-template-create">
            <Plus className="mr-2 h-4 w-4" />
            Template Ekle
          </Button>
        </div>
      </div>

      <div className="surface-panel overflow-hidden p-4">
        {sortedTemplates.length === 0 ? (
          <PageEmptyState
            title="Template bulunmuyor"
            description="Ilk template'i olusturarak sik kullanilan kalem setini sabitleyin."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Kalem sayisi</TableHead>
                <TableHead>Tahmini toplam</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">Aksiyon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTemplates.map((template) => (
                <TableRow key={template.id} data-testid={`job-template-row-${template.id}`}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{template.ad}</p>
                      <p className="text-xs text-muted-foreground">{template.aciklama ?? '-'}</p>
                    </div>
                  </TableCell>
                  <TableCell>{template.itemCount}</TableCell>
                  <TableCell>{toMoney(template.estimatedTotal)}</TableCell>
                  <TableCell>
                    <Badge variant={template.aktif ? 'default' : 'outline'}>{template.aktif ? 'Aktif' : 'Pasif'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => openEdit(template)} disabled={submitting}>
                        Duzenle
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void toggleActive(template)}
                        disabled={submitting}
                      >
                        {template.aktif ? 'Pasif' : 'Aktif'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[960px]" data-testid="job-template-dialog">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Template Duzenle' : 'Template Ekle'}</DialogTitle>
            <DialogDescription>Template item setini olusturun ve sira/miktar/fiyat bilgilerini duzenleyin.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="job-template-name">Template adi</Label>
                <Input
                  id="job-template-name"
                  value={dialogState.ad}
                  onChange={(event) => setDialogState((current) => ({ ...current, ad: event.target.value }))}
                  data-testid="job-template-name-input"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="job-template-default-status">Varsayilan durum</Label>
                <Input
                  id="job-template-default-status"
                  value={dialogState.defaultStatus}
                  onChange={(event) =>
                    setDialogState((current) => ({
                      ...current,
                      defaultStatus: event.target.value,
                    }))
                  }
                  data-testid="job-template-default-status-input"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="job-template-description">Aciklama</Label>
                <Input
                  id="job-template-description"
                  value={dialogState.aciklama}
                  onChange={(event) =>
                    setDialogState((current) => ({
                      ...current,
                      aciklama: event.target.value,
                    }))
                  }
                  data-testid="job-template-description-input"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="job-template-default-notes">Varsayilan not</Label>
                <Input
                  id="job-template-default-notes"
                  value={dialogState.defaultNotlar}
                  onChange={(event) =>
                    setDialogState((current) => ({
                      ...current,
                      defaultNotlar: event.target.value,
                    }))
                  }
                  data-testid="job-template-default-notes-input"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={dialogState.aktif}
                onChange={(event) =>
                  setDialogState((current) => ({
                    ...current,
                    aktif: event.target.checked,
                  }))
                }
                data-testid="job-template-active-checkbox"
              />
              Aktif
            </label>

            <TemplateBuilder
              items={dialogState.items}
              onChange={(items) => setDialogState((current) => ({ ...current, items }))}
              pricebookItems={pricebookItems}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Iptal
            </Button>
            <Button type="button" onClick={() => void saveTemplate()} disabled={submitting} data-testid="job-template-submit">
              {submitting ? 'Kaydediliyor...' : editingTemplate ? 'Guncelle' : 'Olustur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default JobTemplatesTable;
