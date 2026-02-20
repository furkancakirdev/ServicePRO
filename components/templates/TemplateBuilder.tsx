'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PRICEBOOK_ITEM_TYPE_LABELS, type PricebookItemRecord } from '@/types/pricebook';

export type TemplateBuilderItemInput = {
  clientId: string;
  pricebookItemId: string | null;
  ad: string;
  miktar: string;
  birimFiyat: string;
  sira: number;
};

type TemplateBuilderProps = {
  items: TemplateBuilderItemInput[];
  onChange: (items: TemplateBuilderItemInput[]) => void;
  pricebookItems: PricebookItemRecord[];
};

function createClientId(): string {
  return `tmp-${Math.random().toString(36).slice(2, 10)}`;
}

export function TemplateBuilder({ items, onChange, pricebookItems }: TemplateBuilderProps) {
  const [search, setSearch] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [miktar, setMiktar] = useState('1');
  const [birimFiyat, setBirimFiyat] = useState('');

  const filteredPricebookItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return pricebookItems;
    return pricebookItems.filter((item) => {
      const haystack = `${item.kod ?? ''} ${item.ad}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [pricebookItems, search]);

  const selectedItem = useMemo(
    () => pricebookItems.find((item) => item.id === selectedItemId) ?? null,
    [pricebookItems, selectedItemId]
  );

  const updateItem = (clientId: string, patch: Partial<TemplateBuilderItemInput>) => {
    const next = items.map((item) => (item.clientId === clientId ? { ...item, ...patch } : item));
    onChange(next);
  };

  const moveItem = (clientId: string, direction: -1 | 1) => {
    const index = items.findIndex((item) => item.clientId === clientId);
    if (index === -1) return;

    const target = index + direction;
    if (target < 0 || target >= items.length) return;

    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((item, idx) => ({ ...item, sira: idx })));
  };

  const removeItem = (clientId: string) => {
    const next = items.filter((item) => item.clientId !== clientId);
    onChange(next.map((item, index) => ({ ...item, sira: index })));
  };

  const addItem = () => {
    if (!selectedItem) return;

    const parsedQuantity = Number(miktar);
    const parsedPrice = birimFiyat.trim()
      ? Number(birimFiyat)
      : selectedItem.varsayilanFiyat ?? 0;

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) return;
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return;

    const nextItem: TemplateBuilderItemInput = {
      clientId: createClientId(),
      pricebookItemId: selectedItem.id,
      ad: selectedItem.ad,
      miktar: String(parsedQuantity),
      birimFiyat: String(parsedPrice),
      sira: items.length,
    };

    onChange([...items, nextItem]);
    setMiktar('1');
    setBirimFiyat('');
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 rounded-md border border-border/70 p-3 lg:grid-cols-[2fr_2fr_120px_140px_auto]">
        <div className="space-y-1 lg:col-span-2">
          <Label htmlFor="template-builder-search">Pricebook ara</Label>
          <Input
            id="template-builder-search"
            placeholder="Kod veya ad"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            data-testid="template-builder-search"
          />
        </div>

        <div className="space-y-1 lg:col-span-2">
          <Label htmlFor="template-builder-item-select">Kalem secimi</Label>
          <select
            id="template-builder-item-select"
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            value={selectedItemId}
            onChange={(event) => {
              setSelectedItemId(event.target.value);
              const selected = pricebookItems.find((item) => item.id === event.target.value);
              setBirimFiyat(selected?.varsayilanFiyat !== null && selected?.varsayilanFiyat !== undefined ? String(selected.varsayilanFiyat) : '');
            }}
            data-testid="template-builder-item-select"
          >
            <option value="">Kalem seciniz</option>
            {filteredPricebookItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.kod ? `${item.kod} - ` : ''}{item.ad} ({PRICEBOOK_ITEM_TYPE_LABELS[item.tip]})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="template-builder-miktar">Miktar</Label>
          <Input
            id="template-builder-miktar"
            type="number"
            min="0.001"
            step="0.001"
            value={miktar}
            onChange={(event) => setMiktar(event.target.value)}
            data-testid="template-builder-miktar"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="template-builder-birim-fiyat">Birim fiyat</Label>
          <Input
            id="template-builder-birim-fiyat"
            type="number"
            min="0"
            step="0.01"
            value={birimFiyat}
            onChange={(event) => setBirimFiyat(event.target.value)}
            data-testid="template-builder-birim-fiyat"
          />
        </div>

        <div className="flex items-end justify-end">
          <Button type="button" onClick={addItem} data-testid="template-builder-add-item">
            <Plus className="mr-2 h-4 w-4" />
            Ekle
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Template kalemi yok. Pricebook&#39;tan kalem secerek ekleyin.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kalem</TableHead>
              <TableHead>Miktar</TableHead>
              <TableHead>Birim Fiyat</TableHead>
              <TableHead>Sira</TableHead>
              <TableHead className="text-right">Aksiyon</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={item.clientId} data-testid={`template-builder-row-${item.clientId}`}>
                <TableCell>
                  <Input
                    value={item.ad}
                    onChange={(event) => updateItem(item.clientId, { ad: event.target.value })}
                    data-testid={`template-builder-name-${item.clientId}`}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={item.miktar}
                    onChange={(event) => updateItem(item.clientId, { miktar: event.target.value })}
                    data-testid={`template-builder-qty-${item.clientId}`}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.birimFiyat}
                    onChange={(event) => updateItem(item.clientId, { birimFiyat: event.target.value })}
                    data-testid={`template-builder-price-${item.clientId}`}
                  />
                </TableCell>
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button type="button" size="icon" variant="outline" onClick={() => moveItem(item.clientId, -1)} disabled={index === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button type="button" size="icon" variant="outline" onClick={() => moveItem(item.clientId, 1)} disabled={index === items.length - 1}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button type="button" size="icon" variant="destructive" onClick={() => removeItem(item.clientId)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default TemplateBuilder;
