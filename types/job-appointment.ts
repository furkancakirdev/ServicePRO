export type JobAppointmentStatus =
  | 'PLANLANDI'
  | 'ONAY_BEKLIYOR'
  | 'ONAYLANDI'
  | 'YOLDA'
  | 'VARIS'
  | 'BASLADI'
  | 'TAMAMLANDI'
  | 'IPTAL'
  | 'ERTELENDI';

export type JobAppointment = {
  id: string;
  servisId: string;
  personelId: string | null;
  personelAd: string | null;
  personelUnvan: string | null;
  baslangicAt: string;
  bitisAt: string;
  status: JobAppointmentStatus;
  confirmedAt: string | null;
  confirmedByEmail: string | null;
  notlar: string | null;
  sira: number;
  kilitli: boolean;
  createdAt: string;
  updatedAt: string;
};
