"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getLokasyonGroupFromFields, normalizeServisDurumuForApp } from "@/lib/domain-mappers";
import { createUtcDayRange, parseDateOnlyToUtcDate } from "@/lib/date-utils";
import { ChevronDown } from "lucide-react";

interface RowWithId {
  id: string;
  tarih?: string | Date | null;
  saat?: string | null;
  yer?: string | null;
  adres?: string | null;
  durum?: string | null;
}

interface InitialFilters {
  date?: string;
  adresGroup?: AdresGroup;
  statuses?: string[];
}

interface DataTableProps<TData extends RowWithId, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  initialFilters?: InitialFilters;
}

const DEFAULT_STATUS_FILTER = ["RANDEVU_VERILDI", "DEVAM_EDIYOR"];
const STATUS_OPTIONS = [
  { key: "RANDEVU_VERILDI", label: "Planlandı / Randevulu" },
  { key: "DEVAM_EDIYOR", label: "Devam Ediyor" },
  { key: "PARCA_BEKLIYOR", label: "Parça Bekliyor" },
  { key: "MUSTERI_ONAY_BEKLIYOR", label: "Müşteri Onayı Bekliyor" },
  { key: "RAPOR_BEKLIYOR", label: "Rapor Bekliyor" },
  { key: "KESIF_KONTROL", label: "Keşif / Kontrol" },
  { key: "TAMAMLANDI", label: "Tamamlandı" },
  { key: "IPTAL", label: "İptal" },
  { key: "ERTELENDI", label: "Ertelendi" },
];

type AdresGroup = "HEPSI" | "YATMARIN" | "NETSEL" | "DIS_SERVIS";

function parseDate(value: unknown): Date | null {
  return parseDateOnlyToUtcDate(value);
}

function matchesDate(rowDate: Date | null, selectedDate: string): boolean {
  if (!selectedDate) return true;
  if (!rowDate) return false;
  const range = createUtcDayRange(selectedDate);
  if (!range) return false;
  const timestamp = rowDate.getTime();
  return timestamp >= range.start.getTime() && timestamp <= range.end.getTime();
}

function matchesAdresGroup(yer: string, adres: string, group: AdresGroup): boolean {
  if (group === "HEPSI") return true;
  const lokasyonGroup = getLokasyonGroupFromFields(yer, adres);
  return lokasyonGroup === group;
}

export function DataTable<TData extends RowWithId, TValue>({
  columns,
  data,
  searchKey = "tekneAdi",
  initialFilters,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "tarih", desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [selectedDate, setSelectedDate] = React.useState(initialFilters?.date ?? "");
  const [adresGroup, setAdresGroup] = React.useState<AdresGroup>(initialFilters?.adresGroup ?? "HEPSI");
  const [sortingMeasure, setSortingMeasure] = React.useState("TARIH_YENI");
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>(
    initialFilters?.statuses && initialFilters.statuses.length > 0 ? initialFilters.statuses : DEFAULT_STATUS_FILTER
  );

  const filteredData = React.useMemo(() => {
    return data.filter((row) => {
      const rowDate = parseDate(row.tarih);
      if (!matchesDate(rowDate, selectedDate)) return false;
      if (!matchesAdresGroup(String(row.yer || ""), String(row.adres || ""), adresGroup)) return false;
      const normalizedStatus = normalizeServisDurumuForApp(String(row.durum || ""));
      return selectedStatuses.includes(normalizedStatus);
    });
  }, [data, selectedDate, adresGroup, selectedStatuses]);

  React.useEffect(() => {
    switch (sortingMeasure) {
      case "TARIH_ESKI":
        setSorting([{ id: "tarih", desc: false }]);
        break;
      case "TEKNE_AZ":
        setSorting([{ id: "tekneAdi", desc: false }]);
        break;
      case "DURUM":
        setSorting([{ id: "durum", desc: false }]);
        break;
      case "TARIH_YENI":
      default:
        setSorting([{ id: "tarih", desc: true }]);
        break;
    }
  }, [sortingMeasure]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  return (
    <div>
      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <span className="chip">
            Görünen kayıt: {filteredData.length}
          </span>
          <span className="chip">
            Varsayılan sıralama: Tarih (yeniden eskiye)
          </span>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Input
            placeholder="Tekne adı ara..."
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
            onChange={(event) => table.getColumn(searchKey)?.setFilterValue(event.target.value)}
            className="max-w-sm bg-[var(--color-bg)]"
          />

          <Input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="w-[220px] bg-[var(--color-bg)]"
          />

          <select
            value={sortingMeasure}
            onChange={(event) => setSortingMeasure(event.target.value)}
            className="h-10 rounded-md border border-input bg-[var(--color-bg)] px-3 text-sm"
          >
            <option value="TARIH_YENI">Tarih (Yeniye Göre)</option>
            <option value="TARIH_ESKI">Tarih (Eskiye Göre)</option>
            <option value="TEKNE_AZ">Tekne Adı (A-Z)</option>
            <option value="DURUM">Durum</option>
          </select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Durum Filtreleri <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Gösterilecek Durumlar</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {STATUS_OPTIONS.map((status) => {
                const checked = selectedStatuses.includes(status.key);
                return (
                  <DropdownMenuCheckboxItem
                    key={status.key}
                    checked={checked}
                    onCheckedChange={(value) => {
                      setSelectedStatuses((prev) => {
                        if (value) return Array.from(new Set([...prev, status.key]));
                        const next = prev.filter((p) => p !== status.key);
                        return next.length > 0 ? next : prev;
                      });
                    }}
                  >
                    {status.label}
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Kolonlar <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { key: "HEPSI" as const, label: "Hepsi" },
            { key: "YATMARIN" as const, label: "YATMARİN" },
            { key: "NETSEL" as const, label: "NETSEL" },
            { key: "DIS_SERVIS" as const, label: "DIŞ SERVİS" },
          ].map((group) => (
            <Button
              key={group.key}
              variant={adresGroup === group.key ? "default" : "outline"}
              size="sm"
              onClick={() => setAdresGroup(group.key)}
            >
              {group.label}
            </Button>
          ))}
          {selectedDate && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedDate("")}>
              Tarih filtresini temizle
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/30">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    if (row.original?.id) {
                      window.location.href = `/servisler/${row.original.id}/duzenle`;
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Sonuç bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          Önceki
        </Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Sonraki
        </Button>
      </div>
    </div>
  );
}
