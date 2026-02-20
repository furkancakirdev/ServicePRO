'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export type DurumKaydiDto = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  color: string;
  icon: string | null;
  sirasi: number;
  aktif: boolean;
};

type DurumlarTableProps = {
  durumlar: DurumKaydiDto[];
  silinenDurumId: string | null;
  onDuzenle: (durum: DurumKaydiDto) => void;
  onSil: (durum: DurumKaydiDto) => Promise<void>;
};

export function DurumlarTable({
  durumlar,
  silinenDurumId,
  onDuzenle,
  onSil,
}: DurumlarTableProps) {
  return (
    <Table data-testid="status-list-table">
      <TableHeader>
        <TableRow>
          <TableHead>Key</TableHead>
          <TableHead>Etiket</TableHead>
          <TableHead>Renk</TableHead>
          <TableHead>Icon</TableHead>
          <TableHead className="text-right">Sıra</TableHead>
          <TableHead>Durum</TableHead>
          <TableHead className="text-right">İşlem</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {durumlar.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-slate-400">
              Henüz durum kaydı bulunmuyor.
            </TableCell>
          </TableRow>
        ) : (
          durumlar.map((durum) => (
            <TableRow key={durum.id}>
              <TableCell className="font-mono text-xs">{durum.key}</TableCell>
              <TableCell className="font-medium text-slate-100">{durum.label}</TableCell>
              <TableCell>{durum.color}</TableCell>
              <TableCell>{durum.icon ?? '-'}</TableCell>
              <TableCell className="text-right">{durum.sirasi}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${
                    durum.aktif
                      ? 'border-emerald-500/40 text-emerald-300'
                      : 'border-slate-600 text-slate-400'
                  }`}
                >
                  {durum.aktif ? 'Aktif' : 'Pasif'}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="inline-flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    data-testid={`status-edit-button-${durum.key}`}
                    onClick={() => onDuzenle(durum)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    data-testid={`status-delete-button-${durum.key}`}
                    disabled={silinenDurumId === durum.id}
                    onClick={async () => onSil(durum)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
