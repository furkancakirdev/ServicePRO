'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCcw } from 'lucide-react';
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
import { PageEmptyState, PageErrorState, PageLoadingState } from '@/components/ui/page-states';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { PricebookCategoryRecord } from '@/types/pricebook';

type CategoriesResponse = {
  categories: PricebookCategoryRecord[];
};

type CategoryFormState = {
  ad: string;
  parentId: string | null;
  sira: string;
  aktif: boolean;
};

function defaultFormState(): CategoryFormState {
  return {
    ad: '',
    parentId: null,
    sira: '0',
    aktif: true,
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

export function PricebookCategoriesTable() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<PricebookCategoryRecord[]>([]);
  const [search, setSearch] = useState('');

  const [editingCategory, setEditingCategory] = useState<PricebookCategoryRecord | null>(null);
  const [form, setForm] = useState<CategoryFormState>(defaultFormState());

  const sorted = useMemo(
    () => [...categories].sort((left, right) => left.sira - right.sira || left.ad.localeCompare(right.ad, 'tr')),
    [categories]
  );

  const selectableParents = useMemo(() => {
    if (!editingCategory) return sorted;
    return sorted.filter((category) => category.id !== editingCategory.id);
  }, [editingCategory, sorted]);

  const loadCategories = useCallback(async (silent?: boolean) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (search.trim()) {
        params.set('q', search.trim());
      }

      const response = await fetch(`/api/pricebook/categories?${params.toString()}`, {
        cache: 'no-store',
        headers: getAuthHeaders(),
      });
      const payload = (await response.json().catch(() => null)) as CategoriesResponse | null;
      if (!response.ok) {
        throw new Error(parseError(payload, 'Kategori listesi getirilemedi'));
      }

      setCategories(payload?.categories ?? []);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Kategori listesi getirilemedi');
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadCategories(!loading);
    }, loading ? 0 : 250);

    return () => window.clearTimeout(timeout);
  }, [loadCategories, loading]);

  const openCreate = () => {
    setEditingCategory(null);
    setForm(defaultFormState());
  };

  const openEdit = (category: PricebookCategoryRecord) => {
    setEditingCategory(category);
    setForm({
      ad: category.ad,
      parentId: category.parentId,
      sira: String(category.sira),
      aktif: category.aktif,
    });
  };

  const saveCategory = async () => {
    const ad = form.ad.trim();
    if (!ad) {
      toast.error('Kategori adi zorunludur');
      return;
    }

    const sira = Number(form.sira);
    if (!Number.isInteger(sira) || sira < 0) {
      toast.error('Sira alaný 0 veya daha buyuk tam sayi olmalidir');
      return;
    }

    setSubmitting(true);
    try {
      const isEdit = Boolean(editingCategory);
      const endpoint = isEdit ? `/api/pricebook/categories/${editingCategory!.id}` : '/api/pricebook/categories';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          ad,
          parentId: form.parentId,
          sira,
          aktif: form.aktif,
        }),
      });

      const payload = (await response.json().catch(() => null)) as PricebookCategoryRecord | null;
      if (!response.ok) {
        throw new Error(parseError(payload, isEdit ? 'Kategori guncellenemedi' : 'Kategori olusturulamadi'));
      }

      toast.success(isEdit ? 'Kategori guncellendi' : 'Kategori olusturuldu');
      setEditingCategory(null);
      setForm(defaultFormState());
      await loadCategories(true);
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Kategori kaydedilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (category: PricebookCategoryRecord) => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/pricebook/categories/${category.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          aktif: !category.aktif,
        }),
      });

      const payload = (await response.json().catch(() => null)) as PricebookCategoryRecord | null;
      if (!response.ok) {
        throw new Error(parseError(payload, 'Kategori durumu guncellenemedi'));
      }

      setCategories((current) => current.map((item) => (item.id === category.id ? payload! : item)));
      toast.success(category.aktif ? 'Kategori pasiflestirildi' : 'Kategori aktiflestirildi');
    } catch (toggleError) {
      toast.error(toggleError instanceof Error ? toggleError.message : 'Kategori durumu guncellenemedi');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoadingState label="Pricebook kategorileri yukleniyor..." />;
  }

  if (error) {
    return (
      <PageErrorState
        title="Kategori verisi yuklenemedi"
        description={error}
        onRetry={() => void loadCategories()}
      />
    );
  }

  return (
    <section className="space-y-4" data-testid="pricebook-categories-table">
      <div className="surface-panel space-y-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1 space-y-1">
            <Label htmlFor="pricebook-category-search">Kategori ara</Label>
            <Input
              id="pricebook-category-search"
              placeholder="Kategori adi"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              data-testid="pricebook-categories-search"
            />
          </div>

          <Button type="button" variant="outline" onClick={() => void loadCategories(true)} disabled={refreshing || submitting}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Yenile
          </Button>

          <Button type="button" onClick={openCreate} disabled={submitting} data-testid="pricebook-category-create">
            <Plus className="mr-2 h-4 w-4" />
            Kategori Ekle
          </Button>
        </div>

        <div className="grid gap-3 rounded-md border border-border/70 p-3 md:grid-cols-4">
          <div className="space-y-1 md:col-span-2">
            <Label>Kategori adi</Label>
            <Input
              value={form.ad}
              onChange={(event) => setForm((current) => ({ ...current, ad: event.target.value }))}
              placeholder="Kategori adý"
              data-testid="pricebook-category-form-ad"
            />
          </div>

          <div className="space-y-1">
            <Label>Ust kategori</Label>
            <Select
              value={form.parentId ?? 'NONE'}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  parentId: value === 'NONE' ? null : value,
                }))
              }
            >
              <SelectTrigger data-testid="pricebook-category-form-parent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Ust kategori yok</SelectItem>
                {selectableParents.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.ad}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Sira</Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={form.sira}
              onChange={(event) => setForm((current) => ({ ...current, sira: event.target.value }))}
              data-testid="pricebook-category-form-sira"
            />
          </div>

          <label className="md:col-span-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.aktif}
              onChange={(event) => setForm((current) => ({ ...current, aktif: event.target.checked }))}
              data-testid="pricebook-category-form-aktif"
            />
            Aktif
          </label>

          <div className="md:col-span-2 flex justify-end gap-2">
            {editingCategory ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingCategory(null);
                  setForm(defaultFormState());
                }}
                disabled={submitting}
              >
                Duzenlemeyi iptal et
              </Button>
            ) : null}
            <Button type="button" onClick={() => void saveCategory()} disabled={submitting} data-testid="pricebook-category-form-submit">
              {editingCategory ? 'Kategoriyi Guncelle' : 'Kategoriyi Olustur'}
            </Button>
          </div>
        </div>
      </div>

      <div className="surface-panel overflow-hidden p-4">
        {sorted.length === 0 ? (
          <PageEmptyState
            title="Kategori kaydi bulunmuyor"
            description="Ilk kategoriyi olusturarak pricebook hiyerarsisini baslatin."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kategori</TableHead>
                <TableHead>Ust Kategori</TableHead>
                <TableHead>Sira</TableHead>
                <TableHead>Kalem</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">Aksiyon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((category) => (
                <TableRow key={category.id} data-testid={`pricebook-category-row-${category.id}`}>
                  <TableCell>{category.ad}</TableCell>
                  <TableCell>{category.parentName ?? '-'}</TableCell>
                  <TableCell>{category.sira}</TableCell>
                  <TableCell>{category.itemCount ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={category.aktif ? 'default' : 'outline'}>{category.aktif ? 'Aktif' : 'Pasif'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => openEdit(category)} disabled={submitting}>
                        Duzenle
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void toggleActive(category)}
                        disabled={submitting}
                        data-testid={`pricebook-category-toggle-${category.id}`}
                      >
                        {category.aktif ? 'Pasif' : 'Aktif'}
                      </Button>
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

export default PricebookCategoriesTable;
