import { ServisDurumu } from '@prisma/client';

type StatusMapResult = {
  status: ServisDurumu;
  token: string;
  usedFallback: boolean;
};

const DEFAULT_STATUS = ServisDurumu.RANDEVU_VERILDI;

const DEVAM_EDIYOR_STATUS =
  ((ServisDurumu as unknown as Record<string, ServisDurumu>).DEVAM_EDIYOR ??
    (ServisDurumu as unknown as Record<string, ServisDurumu>)['DEVAM_EDİYOR']) as ServisDurumu;

function canonicalizeStatusToken(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  return raw
    .replace(/[İIıi]/g, 'I')
    .replace(/[Çç]/g, 'C')
    .replace(/[Ğğ]/g, 'G')
    .replace(/[Öö]/g, 'O')
    .replace(/[Şş]/g, 'S')
    .replace(/[Üü]/g, 'U')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function mapTokenToStatus(token: string): ServisDurumu | null {
  if (!token) return null;

  const directMap: Record<string, ServisDurumu> = {
    RANDEVU_VERILDI: ServisDurumu.RANDEVU_VERILDI,
    RANDEVU: ServisDurumu.RANDEVU_VERILDI,
    PLANLANDI: ServisDurumu.RANDEVU_VERILDI,
    PLANLANDI_RANDEVU: ServisDurumu.RANDEVU_VERILDI,
    DEVAM: DEVAM_EDIYOR_STATUS,
    DEVAM_EDIYOR: DEVAM_EDIYOR_STATUS,
    PARCA_BEKLIYOR: ServisDurumu.PARCA_BEKLIYOR,
    PARCA: ServisDurumu.PARCA_BEKLIYOR,
    MUSTERI_ONAY_BEKLIYOR: ServisDurumu.MUSTERI_ONAY_BEKLIYOR,
    ONAY_BEKLIYOR: ServisDurumu.MUSTERI_ONAY_BEKLIYOR,
    RAPOR_BEKLIYOR: ServisDurumu.RAPOR_BEKLIYOR,
    RAPOR: ServisDurumu.RAPOR_BEKLIYOR,
    KESIF_KONTROL: ServisDurumu.KESIF_KONTROL,
    KESIF: ServisDurumu.KESIF_KONTROL,
    TAMAMLANDI: ServisDurumu.TAMAMLANDI,
    TAMAM: ServisDurumu.TAMAMLANDI,
    BITTI: ServisDurumu.TAMAMLANDI,
    IPTAL: ServisDurumu.IPTAL,
    ERTELENDI: ServisDurumu.ERTELENDI,
  };

  if (directMap[token]) {
    return directMap[token];
  }

  if (token.includes('IPTAL')) return ServisDurumu.IPTAL;
  if (token.includes('ERTEL')) return ServisDurumu.ERTELENDI;
  if (token.includes('BITTI') || token.includes('TAMAM')) return ServisDurumu.TAMAMLANDI;
  if (token.includes('DEVAM')) return DEVAM_EDIYOR_STATUS;
  if (token.includes('PARCA')) return ServisDurumu.PARCA_BEKLIYOR;
  if (token.includes('ONAY')) return ServisDurumu.MUSTERI_ONAY_BEKLIYOR;
  if (token.includes('RAPOR')) return ServisDurumu.RAPOR_BEKLIYOR;
  if (token.includes('KESIF') || token.includes('KONTROL')) return ServisDurumu.KESIF_KONTROL;
  if (token.includes('RANDEVU') || token.includes('PLAN')) return ServisDurumu.RANDEVU_VERILDI;

  return null;
}

export function mapSheetStatusToDbStatus(value: unknown): StatusMapResult {
  const token = canonicalizeStatusToken(value);
  const mapped = mapTokenToStatus(token);

  if (!mapped) {
    return {
      status: DEFAULT_STATUS,
      token,
      usedFallback: true,
    };
  }

  return {
    status: mapped,
    token,
    usedFallback: false,
  };
}

export function shouldSkipIngestionStatus(status: ServisDurumu): boolean {
  return status === ServisDurumu.TAMAMLANDI || status === ServisDurumu.KESIF_KONTROL;
}
