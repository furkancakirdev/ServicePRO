import { Service, ServisDurumu } from '@/types';
import { getStatusConfig } from '@/lib/config/status-config';

export type WhatsAppTemplateVariant = 'bugun' | 'yarin' | 'haftalik';

const TECHNICAL_TEAM_DEFAULT_STATUSES: ServisDurumu[] = ['RANDEVU_VERILDI', 'DEVAM_EDIYOR'];

function parseServiceDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function isSameDay(left: Date, right: Date): boolean {
  return toDayKey(left) === toDayKey(right);
}

function getWeekRange(reference: Date): { start: Date; end: Date } {
  const day = reference.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(reference);
  start.setDate(reference.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function formatDateTitle(date: Date): string {
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatHour(value?: string): string {
  if (!value) return '--:--';
  return value.trim() || '--:--';
}

function formatServiceLines(service: Service): string[] {
  const lines: string[] = [];
  const saat = formatHour(service.saat);
  lines.push(`${saat} | ${service.tekneAdi}`);
  lines.push(`Adres: ${service.adres || '-'}`);
  lines.push(`Servis: ${service.servisAciklamasi || '-'}`);

  const contactParts = [service.irtibatKisi?.trim(), service.telefon?.trim()].filter(Boolean);
  if (contactParts.length > 0) {
    lines.push(`Irtibat: ${contactParts.join(' / ')}`);
  }

  return lines;
}

export function filterTechnicalTeamServices(
  services: Service[],
  includeStatuses: ServisDurumu[] = TECHNICAL_TEAM_DEFAULT_STATUSES
): Service[] {
  const allowed = new Set(includeStatuses);
  return services.filter((service) => allowed.has(service.durum));
}

export function selectServicesByTemplate(
  services: Service[],
  variant: WhatsAppTemplateVariant,
  referenceDate: Date = new Date()
): Service[] {
  const filtered = filterTechnicalTeamServices(services);
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const thisWeek = getWeekRange(today);

  return filtered.filter((service) => {
    const date = parseServiceDate(service.tarih);
    if (!date) return false;

    if (variant === 'bugun') return isSameDay(date, today);
    if (variant === 'yarin') return isSameDay(date, tomorrow);
    return date >= thisWeek.start && date <= thisWeek.end;
  });
}

export function getDevamEdenler(services: Service[]): Service[] {
  return services.filter((service) => service.durum === 'DEVAM_EDIYOR');
}

export function generateTechnicalTeamTemplate(params: {
  variant: WhatsAppTemplateVariant;
  services: Service[];
  referenceDate?: Date;
}): string {
  const referenceDate = params.referenceDate ?? new Date();
  const planItems = selectServicesByTemplate(params.services, params.variant, referenceDate)
    .slice()
    .sort((left, right) => {
      const leftDate = parseServiceDate(left.tarih)?.getTime() ?? 0;
      const rightDate = parseServiceDate(right.tarih)?.getTime() ?? 0;
      if (leftDate !== rightDate) return leftDate - rightDate;
      return formatHour(left.saat).localeCompare(formatHour(right.saat), 'tr');
    });
  const ongoing = getDevamEdenler(params.services)
    .slice()
    .sort((left, right) => left.tekneAdi.localeCompare(right.tekneAdi, 'tr'));

  const titleByVariant: Record<WhatsAppTemplateVariant, string> = {
    bugun: 'TEKNIK EKIP - BUGUNUN ISLERI',
    yarin: 'TEKNIK EKIP - YARININ ISLERI',
    haftalik: 'TEKNIK EKIP - BU HAFTA',
  };

  const dateRange =
    params.variant === 'haftalik'
      ? (() => {
          const range = getWeekRange(referenceDate);
          return `${formatDateTitle(range.start)} - ${formatDateTitle(range.end)}`;
        })()
      : (() => {
          const displayDate = new Date(referenceDate);
          if (params.variant === 'yarin') {
            displayDate.setDate(displayDate.getDate() + 1);
          }
          return formatDateTitle(displayDate);
        })();

  const lines: string[] = [];
  lines.push(`${titleByVariant[params.variant]}`);
  lines.push(`Tarih: ${dateRange}`);
  lines.push('');

  if (planItems.length === 0) {
    lines.push('Planlanan servis bulunmamaktadir.');
  } else {
    lines.push(`Planlanan Servisler (${planItems.length})`);
    lines.push('------------------------------');
    planItems.forEach((service) => {
      lines.push(...formatServiceLines(service));
      lines.push('');
    });
  }

  lines.push(`Devam Eden Isler (${ongoing.length})`);
  lines.push('------------------------------');
  if (ongoing.length === 0) {
    lines.push('Devam eden is bulunmamaktadir.');
  } else {
    ongoing.forEach((service) => {
      const statusLabel = getStatusConfig(service.durum)?.label || service.durum;
      lines.push(`- ${service.tekneAdi} | ${service.adres || '-'} | ${statusLabel}`);
    });
  }

  return lines.join('\n').trim();
}

// Backward-compatible exports
export function generateWhatsAppRapor(config: {
  baslik: string;
  tarih: string;
  servisler: Service[];
  devamEdenler?: Service[];
}): string {
  const serviceLines = config.servisler
    .map((service) => {
      const lines = formatServiceLines(service);
      return lines.join('\n');
    })
    .join('\n\n');

  const devamLines =
    config.devamEdenler && config.devamEdenler.length > 0
      ? `\n\nDevam Eden Isler\n------------------------------\n${config.devamEdenler
          .map((service) => `- ${service.tekneAdi} | ${service.adres}`)
          .join('\n')}`
      : '';

  return `${config.baslik}\nTarih: ${config.tarih}\n\n${serviceLines || 'Planlanan servis bulunmamaktadir.'}${devamLines}`.trim();
}

export function generateYarinRaporu(yarinServisler: Service[], devamEdenler: Service[]): string {
  return generateWhatsAppRapor({
    baslik: 'TEKNIK EKIP - YARININ ISLERI',
    tarih: formatDateTitle(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    servisler: filterTechnicalTeamServices(yarinServisler),
    devamEdenler,
  });
}

export function generateHaftaRaporu(haftaServisler: Service[], devamEdenler: Service[]): string {
  const week = getWeekRange(new Date());
  return generateWhatsAppRapor({
    baslik: 'TEKNIK EKIP - BU HAFTA',
    tarih: `${formatDateTitle(week.start)} - ${formatDateTitle(week.end)}`,
    servisler: filterTechnicalTeamServices(haftaServisler),
    devamEdenler,
  });
}
