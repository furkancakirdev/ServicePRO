'use client';

import { Badge } from '@/components/ui/badge';
import { getStatusConfig } from '@/lib/config/status-config';
import { normalizeServisDurumuForApp } from '@/lib/domain-mappers';
import {
  CalendarClock,
  CheckCircle2,
  FileText,
  PauseCircle,
  Package,
  Search,
  UserRoundCheck,
  Wrench,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

const STATUS_ICON_MAP: Record<string, LucideIcon> = {
  RANDEVU_VERILDI: CalendarClock,
  DEVAM_EDIYOR: Wrench,
  PARCA_BEKLIYOR: Package,
  MUSTERI_ONAY_BEKLIYOR: UserRoundCheck,
  RAPOR_BEKLIYOR: FileText,
  KESIF_KONTROL: Search,
  TAMAMLANDI: CheckCircle2,
  IPTAL: XCircle,
  ERTELENDI: PauseCircle,
};

export function getOperationStatusIcon(status: string): LucideIcon {
  const normalized = normalizeServisDurumuForApp(status);
  return STATUS_ICON_MAP[normalized] ?? CalendarClock;
}

interface OperationStatusBadgeProps {
  status: string;
  compact?: boolean;
}

export function OperationStatusBadge({ status, compact = false }: OperationStatusBadgeProps) {
  const config = getStatusConfig(status);
  const Icon = getOperationStatusIcon(status);

  return (
    <Badge
      className={`inline-flex items-center gap-1 border-0 ${config.bgColor} ${config.color} ${
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <Icon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      <span className="truncate">{config.label}</span>
    </Badge>
  );
}
