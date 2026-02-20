export type BookingStatus =
  | 'YENI'
  | 'ISLEMDE'
  | 'JOB_OLUSTURULDU'
  | 'LEAD_OLUSTURULDU'
  | 'REDDEDILDI';

export type LeadStatus =
  | 'YENI'
  | 'TAKIPTE'
  | 'TEKLIF_BEKLIYOR'
  | 'KAYBEDILDI'
  | 'KAZANILDI';

export type BookingRecord = {
  id: string;
  kaynak: string | null;
  arayanAd: string | null;
  telefon: string | null;
  email: string | null;
  tekneAd: string | null;
  tekneSeriNo: string | null;
  konu: string | null;
  notlar: string | null;
  tercihTarih: string | null;
  tercihSaatAraligi: string | null;
  status: BookingStatus;
  tekneId: string | null;
  servisId: string | null;
  leadId: string | null;
  ownerUserId: string | null;
  createdAt: string;
  updatedAt: string;
  tekne?: {
    id: string;
    ad: string;
  } | null;
  ownerUser?: {
    id: string;
    ad: string;
    email: string;
  } | null;
  servis?: {
    id: string;
    tekneAdi: string;
    durum: string;
  } | null;
  lead?: {
    id: string;
    status: LeadStatus;
    takipAt: string | null;
  } | null;
};

export type LeadRecord = {
  id: string;
  kaynak: string | null;
  ad: string | null;
  telefon: string | null;
  email: string | null;
  konu: string | null;
  notlar: string | null;
  status: LeadStatus;
  takipAt: string | null;
  tekneId: string | null;
  ownerUserId: string | null;
  createdAt: string;
  updatedAt: string;
  overdue?: boolean;
  tekne?: {
    id: string;
    ad: string;
  } | null;
  ownerUser?: {
    id: string;
    ad: string;
    email: string;
  } | null;
};
