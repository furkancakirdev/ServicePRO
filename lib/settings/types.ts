export const SYNC_SHEET_OPTIONS = [
  'PLANLAMA',
  'PERSONEL',
  'TEKNELER',
  'PUANLAMA',
  'AYLIK_OZET',
] as const;

export type SyncSheetOption = (typeof SYNC_SHEET_OPTIONS)[number];

export interface ThemeSettings {
  primaryColor: string;
  darkMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

export interface WeatherSettings {
  defaultLocationName: string;
  defaultLatitude: number | null;
  defaultLongitude: number | null;
}

export interface SyncSettings {
  enabled: boolean;
  defaultSheet: SyncSheetOption;
  staleThresholdMinutes: number;
  validationSampleLimit: number;
  allowFullReset: boolean;
  cronExpression: string;
  timezone: string;
}

export interface AccessSettings {
  yetkiliCanAccessSettings: boolean;
  yetkiliCanRunSyncValidation: boolean;
  yetkiliCanViewSyncLogs: boolean;
}

export interface CompanySettings {
  name: string;
  supportEmail: string;
  supportPhone: string;
}

export interface UiSettings {
  densityDefault: 'comfortable' | 'compact';
  hintsDefaultVisible: boolean;
  animationsEnabled: boolean;
  highContrastMode: boolean;
  largeTouchTargets: boolean;
  compactTablesByDefault: boolean;
  stickyQuickActions: boolean;
}

export interface PartsEtaSettings {
  enabled: boolean;
  minHistoryRecords: number;
  historyLookbackDays: number;
  defaultWaitingEtaDays: number;
  defaultOrderedEtaDays: number;
  maxEtaDays: number;
}

export interface FormGuardSettings {
  requireStartDate: boolean;
  requireAssignedPersonnel: boolean;
  requireEtaForWaitingParts: boolean;
  requireEtaForOrderedParts: boolean;
  requireSupplierForWaitingParts: boolean;
  warnOnMissingContactInfo: boolean;
}

export interface AppSettings {
  theme: ThemeSettings;
  weather: WeatherSettings;
  sync: SyncSettings;
  access: AccessSettings;
  company: CompanySettings;
  ui: UiSettings;
  partsEta: PartsEtaSettings;
  formGuards: FormGuardSettings;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: {
    primaryColor: '#3b82f6',
    darkMode: true,
    fontSize: 'medium',
  },
  weather: {
    defaultLocationName: 'Marmaris',
    defaultLatitude: 36.8529,
    defaultLongitude: 28.2742,
  },
  sync: {
    enabled: true,
    defaultSheet: 'PLANLAMA',
    staleThresholdMinutes: 15,
    validationSampleLimit: 2000,
    allowFullReset: true,
    cronExpression: '*/10 * * * *',
    timezone: 'Europe/Istanbul',
  },
  access: {
    yetkiliCanAccessSettings: true,
    yetkiliCanRunSyncValidation: true,
    yetkiliCanViewSyncLogs: true,
  },
  company: {
    name: 'ServicePRO',
    supportEmail: 'destek@servicepro.local',
    supportPhone: '+90 252 000 00 00',
  },
  ui: {
    densityDefault: 'comfortable',
    hintsDefaultVisible: true,
    animationsEnabled: true,
    highContrastMode: false,
    largeTouchTargets: false,
    compactTablesByDefault: false,
    stickyQuickActions: true,
  },
  partsEta: {
    enabled: true,
    minHistoryRecords: 2,
    historyLookbackDays: 365,
    defaultWaitingEtaDays: 5,
    defaultOrderedEtaDays: 3,
    maxEtaDays: 30,
  },
  formGuards: {
    requireStartDate: false,
    requireAssignedPersonnel: false,
    requireEtaForWaitingParts: true,
    requireEtaForOrderedParts: true,
    requireSupplierForWaitingParts: false,
    warnOnMissingContactInfo: true,
  },
};
