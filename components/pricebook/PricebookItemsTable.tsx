'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { ItemDialog, type ItemDialogPayload, type PricebookCategoryOption } from '@/components/pricebook/ItemDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageEmptyState, PageErrorState, PageLoadingState } from '@/components/ui/page-states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  PRICEBOOK_ITEM_TYPE_LABELS,
  PRICEBOOK_ITEM_TYPE_VALUES,
  type PricebookCategoryRecord,
  type PricebookItemRecord,
  type PricebookItemTypeValue,
} from '@/types/pricebook';

type PricebookItemsResponse = {
  items: PricebookItemRecord[];
};

type PricebookCategoriesResponse = {
  categories: PricebookCategoryRecord[];
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

function toMoney(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function PricebookItemsTable() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<PricebookItemRecord[]>([]);
  const [categories, setCategories] = useState<PricebookCategoryOption[]>([]);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | PricebookItemTypeValue>('ALL');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'PASSIVE'>('ALL');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PricebookItemRecord | null>(null);

  const sortedItems = useMemo(
    () =>
      [...items].sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      ),
    [items]
  );

  const loadAll = useCallback(async (silent?: boolean) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const itemParams = new URLSearchParams();
      if (search.trim()) itemParams.set('q', search.trim());
      if (typeFilter !== 'ALL') itemParams.set('type', typeFilter);
      if (activeFilter === 'ACTIVE') itemParams.set('aktif', 'true');
      if (activeFilter === 'PASSIVE') itemParams.set('aktif', 'false');

      const [itemsRes, categoriesRes] = await Promise.all([
        fetch(`/api/pricebook/items?${itemParams.toString()}`, {
          cache: 'no-store',
          headers: getAuthHeaders(),
        }),
        fetch('/api/pricebook/categories?aktif=true', {
          cache: 'no-store',
          headers: getAuthHeaders(),
        }),
      ]);

      const itemsBody = (await itemsRes.json().catch(() => null)) as PricebookItemsResponse | null;
      const categoriesBody = (await categoriesRes.json().catch(() => null)) as PricebookCategoriesResponse | null;

      if (!itemsRes.ok) {
        throw new Error(parseError(itemsBody, 'Pricebook item listesi getirilemedi'));
      }
      if (!categoriesRes.ok) {
        throw new Error(parseError(categoriesBody, 'Pricebook kategori listesi getirilemedi'));
      }

      setItems(itemsBody?.items ?? []);
      setCategories(
        (categoriesBody?.categories ?? []).map((category) => ({
          id: category.id,
          ad: category.ad,
        }))
      );
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Pricebook verisi yuklenemedi');
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [activeFilter, search, typeFilter]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadAll(!loading);
    }, loading ? 0 : 250);

    return () => window.clearTimeout(timeout);
  }, [loadAll, loading]);

  const handleCreate = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: PricebookItemRecord) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const saveItem = async (payload: ItemDialogPayload) => {
    setSubmitting(true);
    try {
      const isEdit = Boolean(editingItem);
      const endpoint = isEdit ? `/api/pricebook/items/${editingItem!.id}` : '/api/pricebook/items';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => null)) as PricebookItemRecord | null;
      if (!response.ok) {
        throw new Error(parseError(body, isEdit ? 'Kalem guncellenemedi' : 'Kalem olusturulamadi'));
      }

      toast.success(isEdit ? 'Pricebook kalemi guncellendi' : 'Pricebook kalemi olusturuldu');
      setDialogOpen(false);
      setEditingItem(null);
      await loadAll(true);
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Kalem kaydedilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (item: PricebookItemRecord) => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/pricebook/items/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          aktif: !item.aktif,
        }),
      });

      const body = (await response.json().catch(() => null)) as PricebookItemRecord | null;
      if (!response.ok) {
        throw new Error(parseError(body, 'Kalem durumu guncellenemedi'));
      }

      setItems((current) => current.map((row) => (row.id === item.id ? body! : row)));
      toast.success(item.aktif ? 'Kalem pasiflestirildi' : 'Kalem aktiflestirildi');
    } catch (toggleError) {
      toast.error(toggleError instanceof Error ? toggleError.message : 'Kalem durumu guncellenemedi');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoadingState label="Pricebook kalemleri yukleniyor..." />;
  }

  if (error) {
    return (
      <PageErrorState
        title="Pricebook verisi yuklenemedi"
        description={error}
        onRetry={() => void loadAll()}
      />
    );
  }

  return (
    <section className="space-y-4" data-testid="pricebook-items-table">
      <div className="surface-panel space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto]">
          <Input
            placeholder="Kod veya ad ara"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            data-testid="pricebook-items-search"
          />

          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as 'ALL' | PricebookItemTypeValue)}>
            <SelectTrigger data-testid="pricebook-items-type-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tum tipler</SelectItem>
              {PRICEBOOK_ITEM_TYPE_VALUES.map((type) => (
                <SelectItem key={type} value={type}>
                  {PRICEBOOK_ITEM_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={activeFilter} onValueChange={(value) => setActiveFilter(value as 'ALL' | 'ACTIVE' | 'PASSIVE')}>
            <SelectTrigger data-testid="pricebook-items-active-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tum durumlar</SelectItem>
              <SelectItem value="ACTIVE">Sadece aktif</SelectItem>
              <SelectItem value="PASSIVE">Sadece pasif</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => void loadAll(true)} disabled={refreshing || submitting}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Yenile
            </Button>
            <Button type="button" onClick={handleCreate} disabled={submitting} data-testid="pricebook-item-create">
              <Plus className="mr-2 h-4 w-4" />
              Kalem Ekle
            </Button>
          </div>
        </div>
      </div>

      <div className="surface-panel overflow-hidden p-4">
        {sortedItems.length === 0 ? (
          <PageEmptyState
            title="Pricebook kalemi bulunmuyor"
            description="Ilk kalemi olusturarak estimate akisini standardize edin."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kod</TableHead>
                <TableHead>Ad</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Vars. Fiyat</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">Aksiyon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.map((item) => (
                <TableRow key={item.id} data-testid={`pricebook-item-row-${item.id}`}>
                  <TableCell>{item.kod ?? '-'}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{item.ad}</p>
                      <p className="text-xs text-muted-foreground">{item.birim ?? '-'}</p>
                    </div>
                  </TableCell>
                  <TableCell>{PRICEBOOK_ITEM_TYPE_LABELS[item.tip]}</TableCell>
                  <TableCell>{item.categoryName ?? '-'}</TableCell>
                  <TableCell>{toMoney(item.varsayilanFiyat)}</TableCell>
                  <TableCell>
                    <Badge variant={item.aktif ? 'default' : 'outline'}>{item.aktif ? 'Aktif' : 'Pasif'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => handleEdit(item)} disabled={submitting}>
                        Duzenle
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void toggleActive(item)}
                        disabled={submitting}
                        data-testid={`pricebook-item-toggle-${item.id}`}
                      >
                        {item.aktif ? 'Pasif' : 'Aktif'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={categories}
        initialValue={editingItem}
        submitting={submitting}
        onSubmit={saveItem}
      />
    </section>
  );
}

export default PricebookItemsTable;
