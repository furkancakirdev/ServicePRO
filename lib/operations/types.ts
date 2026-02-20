export type LocationGroup = 'YATMARIN' | 'NETSEL' | 'DIS_SERVIS';

export type StatusCanonical =
  | 'RANDEVU_VERILDI'
  | 'DEVAM_EDIYOR'
  | 'PARCA_BEKLIYOR'
  | 'MUSTERI_ONAY_BEKLIYOR'
  | 'RAPOR_BEKLIYOR'
  | 'KESIF_KONTROL'
  | 'TAMAMLANDI'
  | 'IPTAL'
  | 'ERTELENDI';

export interface OperationsOverviewDto {
  range: {
    start: string;
    end: string;
    label: string;
  };
  totals: {
    allServices: number;
    openServices: number;
    scheduledInRange: number;
    unscheduledOpen: number;
    externalInRange: number;
  };
  capacity: {
    activeTechnicianCount: number;
    weeklyCapacity: number;
    plannedInRange: number;
    utilizationPct: number;
  };
  dailyLoad: Array<{
    date: string;
    dayLabel: string;
    total: number;
    yatmarin: number;
    netsel: number;
    disServis: number;
    boatCount: number;
  }>;
  yatmarinByDay: Array<{
    date: string;
    dayLabel: string;
    serviceCount: number;
    boatCount: number;
  }>;
  externalDestinations: Array<{
    destination: string;
    serviceCount: number;
    boatCount: number;
  }>;
  unscheduledByStatus: Array<{
    status: StatusCanonical;
    count: number;
  }>;
  locationBreakdown: Array<{
    group: LocationGroup;
    count: number;
  }>;
}

