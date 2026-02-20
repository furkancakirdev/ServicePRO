export type DispatchView = 'day' | 'week';

export type DispatchConfirmedFilter = 'all' | 'confirmed' | 'unconfirmed';

export type DispatchJobSummary = {
  id: string;
  tekneAdi: string;
  servisAciklamasi: string;
  yer: string;
  adres: string;
  durum: string;
};

export type DispatchAppointment = {
  id: string;
  servisId: string;
  personelId: string | null;
  personelAd: string | null;
  personelUnvan: string | null;
  baslangicAt: string;
  bitisAt: string;
  status: string;
  confirmedAt: string | null;
  confirmedByEmail: string | null;
  notlar: string | null;
  sira: number;
  kilitli: boolean;
  createdAt: string;
  updatedAt: string;
  job: DispatchJobSummary;
};

export type DispatchFiltersState = {
  konum: string;
  durum: string;
  confirmed: DispatchConfirmedFilter;
  personelId: string;
};

export type DispatchPersonelOption = {
  id: string;
  ad: string;
  unvan: string;
  aktifIsSayisi: number;
  guncelDurum: string;
};

export type DispatchPreferenceDto = {
  view: 'DAY' | 'WEEK';
  shownPersonelIds: string[];
  yogunMod: boolean;
  updatedAt: string | null;
};

export type DispatchApiResponse = {
  timezone: string;
  appointments: DispatchAppointment[];
  unassigned: string[];
};
