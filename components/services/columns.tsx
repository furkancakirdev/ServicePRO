"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Service } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, CheckCircle, MoreHorizontal, Pencil } from "lucide-react";
import { normalizeServisDurumuForApp } from "@/lib/domain-mappers";
import { formatDateOnlyTR, parseDateOnlyToUtcDate } from "@/lib/date-utils";

function parseServiceDate(value: unknown): Date | null {
  return parseDateOnlyToUtcDate(value);
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  RANDEVU_VERILDI: { label: "Planlandı / Randevulu", color: "bg-blue-500" },
  DEVAM_EDIYOR: { label: "Devam Ediyor", color: "bg-amber-500" },
  PARCA_BEKLIYOR: { label: "Parça Bekliyor", color: "bg-orange-500" },
  MUSTERI_ONAY_BEKLIYOR: { label: "Müşteri Onayı Bekliyor", color: "bg-purple-500" },
  RAPOR_BEKLIYOR: { label: "Rapor Bekliyor", color: "bg-indigo-500" },
  KESIF_KONTROL: { label: "Keşif / Kontrol", color: "bg-cyan-500" },
  TAMAMLANDI: { label: "Tamamlandı", color: "bg-emerald-600" },
  IPTAL: { label: "İptal", color: "bg-red-500" },
  ERTELENDI: { label: "Ertelendi", color: "bg-zinc-500" },
};

export const columns: ColumnDef<Service>[] = [
  {
    accessorKey: "tarih",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        TARİH SAAT
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = parseServiceDate(row.getValue("tarih"));
      const saat = String(row.original.saat ?? "").trim();
      if (!date) {
        return <div className="text-muted-foreground">Geçersiz tarih</div>;
      }
      return (
        <div className="flex flex-col">
          <span className="font-medium">{formatDateOnlyTR(date)}</span>
          <span className="text-xs text-muted-foreground">{saat || "--:--"}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "tekneAdi",
    header: "TEKNE ADI",
  },
  {
    accessorKey: "yer",
    header: "ADRES",
    cell: ({ row }) => {
      const yer = String(row.getValue("yer") ?? "");
      const adres = String(row.original.adres ?? "");
      return (
        <div className="max-w-[280px]">
          <div className="truncate font-medium" title={yer}>
            {yer || "-"}
          </div>
          {adres && (
            <div className="truncate text-xs text-muted-foreground" title={adres}>
              {adres}
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "servisAciklamasi",
    header: "SERVİS AÇIKLAMASI",
    cell: ({ row }) => {
      const text = String(row.getValue("servisAciklamasi") ?? "");
      return (
        <div className="max-w-[360px] truncate" title={text}>
          {text}
        </div>
      );
    },
  },
  {
    accessorKey: "durum",
    header: "DURUM",
    cell: ({ row }) => {
      const status = normalizeServisDurumuForApp(String(row.getValue("durum") || ""));
      const config = STATUS_CONFIG[status] || { label: status, color: "bg-zinc-500" };

      return <Badge className={`${config.color} text-white border-0`}>{config.label}</Badge>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const service = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Menü</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `/servisler/${service.id}/duzenle`;
              }}
            >
              <Pencil className="mr-2 h-4 w-4" /> Düzenle
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `/servisler/${service.id}?action=complete`;
              }}
            >
              <CheckCircle className="mr-2 h-4 w-4 text-green-600" /> Tamamla
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
