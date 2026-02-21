import fs from 'fs';
import path from 'path';
import {
  type AccessSettings,
  DEFAULT_APP_SETTINGS,
  type AppSettings,
  type CompanySettings,
  type FormGuardSettings,
  type PartsEtaSettings,
  type SyncSettings,
  SYNC_SHEET_OPTIONS,
  type ThemeSettings,
  type UiSettings,
  type WeatherSettings,
} from './types';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function getNullableNumber(value: unknown, fallback: number | null): number | null {
  if (value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function getBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return fallback;
}

function parseThemeSettings(value: unknown): ThemeSettings {
  const raw = isRecord(value) ? value : {};
  const fontSizeRaw = getString(raw.fontSize, DEFAULT_APP_SETTINGS.theme.fontSize);
  const fontSize = ['small', 'medium', 'large'].includes(fontSizeRaw)
    ? (fontSizeRaw as ThemeSettings['fontSize'])
    : DEFAULT_APP_SETTINGS.theme.fontSize;

  return {
    primaryColor: getString(raw.primaryColor, DEFAULT_APP_SETTINGS.theme.primaryColor),
    darkMode: getBoolean(raw.darkMode, DEFAULT_APP_SETTINGS.theme.darkMode),
    fontSize,
  };
}

function parseWeatherSettings(value: unknown): WeatherSettings {
  const raw = isRecord(value) ? value : {};
  return {
    defaultLocationName: getString(
      raw.defaultLocationName,
      DEFAULT_APP_SETTINGS.weather.defaultLocationName
    ),
    defaultLatitude: getNullableNumber(
      raw.defaultLatitude,
      DEFAULT_APP_SETTINGS.weather.defaultLatitude
    ),
    defaultLongitude: getNullableNumber(
      raw.defaultLongitude,
      DEFAULT_APP_SETTINGS.weather.defaultLongitude
    ),
  };
}

function parseSyncSettings(value: unknown): SyncSettings {
  const raw = isRecord(value) ? value : {};
  const defaultSheetRaw = getString(raw.defaultSheet, DEFAULT_APP_SETTINGS.sync.defaultSheet).toUpperCase();
  const defaultSheet = SYNC_SHEET_OPTIONS.includes(defaultSheetRaw as SyncSettings['defaultSheet'])
    ? (defaultSheetRaw as SyncSettings['defaultSheet'])
    : DEFAULT_APP_SETTINGS.sync.defaultSheet;

  const staleThresholdRaw =
    typeof raw.staleThresholdMinutes === 'number'
      ? raw.staleThresholdMinutes
      : Number(raw.staleThresholdMinutes);
  const validationSampleLimitRaw =
    typeof raw.validationSampleLimit === 'number'
      ? raw.validationSampleLimit
      : Number(raw.validationSampleLimit);

  return {
    enabled: getBoolean(raw.enabled, DEFAULT_APP_SETTINGS.sync.enabled),
    defaultSheet,
    staleThresholdMinutes: Number.isFinite(staleThresholdRaw)
      ? clampNumber(staleThresholdRaw, 5, 180)
      : DEFAULT_APP_SETTINGS.sync.staleThresholdMinutes,
    validationSampleLimit: Number.isFinite(validationSampleLimitRaw)
      ? clampNumber(validationSampleLimitRaw, 50, 10000)
      : DEFAULT_APP_SETTINGS.sync.validationSampleLimit,
    allowFullReset: getBoolean(raw.allowFullReset, DEFAULT_APP_SETTINGS.sync.allowFullReset),
    cronExpression: getString(raw.cronExpression, DEFAULT_APP_SETTINGS.sync.cronExpression),
    timezone: getString(raw.timezone, DEFAULT_APP_SETTINGS.sync.timezone),
  };
}

function parseAccessSettings(value: unknown): AccessSettings {
  const raw = isRecord(value) ? value : {};
  return {
    yetkiliCanAccessSettings: getBoolean(
      raw.yetkiliCanAccessSettings,
      DEFAULT_APP_SETTINGS.access.yetkiliCanAccessSettings
    ),
    yetkiliCanRunSyncValidation: getBoolean(
      raw.yetkiliCanRunSyncValidation,
      DEFAULT_APP_SETTINGS.access.yetkiliCanRunSyncValidation
    ),
    yetkiliCanViewSyncLogs: getBoolean(
      raw.yetkiliCanViewSyncLogs,
      DEFAULT_APP_SETTINGS.access.yetkiliCanViewSyncLogs
    ),
  };
}

function parseCompanySettings(value: unknown): CompanySettings {
  const raw = isRecord(value) ? value : {};
  return {
    name: getString(raw.name, DEFAULT_APP_SETTINGS.company.name),
    logoUrl: getString(raw.logoUrl, DEFAULT_APP_SETTINGS.company.logoUrl),
    supportEmail: getString(raw.supportEmail, DEFAULT_APP_SETTINGS.company.supportEmail),
    supportPhone: getString(raw.supportPhone, DEFAULT_APP_SETTINGS.company.supportPhone),
  };
}

function parseUiSettings(value: unknown): UiSettings {
  const raw = isRecord(value) ? value : {};
  const densityRaw = getString(raw.densityDefault, DEFAULT_APP_SETTINGS.ui.densityDefault);
  const densityDefault = densityRaw === 'compact' ? 'compact' : 'comfortable';

  return {
    densityDefault,
    hintsDefaultVisible: getBoolean(
      raw.hintsDefaultVisible,
      DEFAULT_APP_SETTINGS.ui.hintsDefaultVisible
    ),
    animationsEnabled: getBoolean(raw.animationsEnabled, DEFAULT_APP_SETTINGS.ui.animationsEnabled),
    highContrastMode: getBoolean(raw.highContrastMode, DEFAULT_APP_SETTINGS.ui.highContrastMode),
    largeTouchTargets: getBoolean(raw.largeTouchTargets, DEFAULT_APP_SETTINGS.ui.largeTouchTargets),
    compactTablesByDefault: getBoolean(
      raw.compactTablesByDefault,
      DEFAULT_APP_SETTINGS.ui.compactTablesByDefault
    ),
    stickyQuickActions: getBoolean(raw.stickyQuickActions, DEFAULT_APP_SETTINGS.ui.stickyQuickActions),
  };
}

function parsePartsEtaSettings(value: unknown): PartsEtaSettings {
  const raw = isRecord(value) ? value : {};
  const minHistoryRecordsRaw =
    typeof raw.minHistoryRecords === 'number' ? raw.minHistoryRecords : Number(raw.minHistoryRecords);
  const historyLookbackDaysRaw =
    typeof raw.historyLookbackDays === 'number' ? raw.historyLookbackDays : Number(raw.historyLookbackDays);
  const defaultWaitingEtaDaysRaw =
    typeof raw.defaultWaitingEtaDays === 'number'
      ? raw.defaultWaitingEtaDays
      : Number(raw.defaultWaitingEtaDays);
  const defaultOrderedEtaDaysRaw =
    typeof raw.defaultOrderedEtaDays === 'number'
      ? raw.defaultOrderedEtaDays
      : Number(raw.defaultOrderedEtaDays);
  const maxEtaDaysRaw = typeof raw.maxEtaDays === 'number' ? raw.maxEtaDays : Number(raw.maxEtaDays);

  return {
    enabled: getBoolean(raw.enabled, DEFAULT_APP_SETTINGS.partsEta.enabled),
    minHistoryRecords: Number.isFinite(minHistoryRecordsRaw)
      ? clampNumber(Math.round(minHistoryRecordsRaw), 1, 20)
      : DEFAULT_APP_SETTINGS.partsEta.minHistoryRecords,
    historyLookbackDays: Number.isFinite(historyLookbackDaysRaw)
      ? clampNumber(Math.round(historyLookbackDaysRaw), 30, 1095)
      : DEFAULT_APP_SETTINGS.partsEta.historyLookbackDays,
    defaultWaitingEtaDays: Number.isFinite(defaultWaitingEtaDaysRaw)
      ? clampNumber(Math.round(defaultWaitingEtaDaysRaw), 1, 90)
      : DEFAULT_APP_SETTINGS.partsEta.defaultWaitingEtaDays,
    defaultOrderedEtaDays: Number.isFinite(defaultOrderedEtaDaysRaw)
      ? clampNumber(Math.round(defaultOrderedEtaDaysRaw), 1, 90)
      : DEFAULT_APP_SETTINGS.partsEta.defaultOrderedEtaDays,
    maxEtaDays: Number.isFinite(maxEtaDaysRaw)
      ? clampNumber(Math.round(maxEtaDaysRaw), 3, 180)
      : DEFAULT_APP_SETTINGS.partsEta.maxEtaDays,
  };
}

function parseFormGuardSettings(value: unknown): FormGuardSettings {
  const raw = isRecord(value) ? value : {};
  return {
    requireStartDate: getBoolean(raw.requireStartDate, DEFAULT_APP_SETTINGS.formGuards.requireStartDate),
    requireAssignedPersonnel: getBoolean(
      raw.requireAssignedPersonnel,
      DEFAULT_APP_SETTINGS.formGuards.requireAssignedPersonnel
    ),
    requireEtaForWaitingParts: getBoolean(
      raw.requireEtaForWaitingParts,
      DEFAULT_APP_SETTINGS.formGuards.requireEtaForWaitingParts
    ),
    requireEtaForOrderedParts: getBoolean(
      raw.requireEtaForOrderedParts,
      DEFAULT_APP_SETTINGS.formGuards.requireEtaForOrderedParts
    ),
    requireSupplierForWaitingParts: getBoolean(
      raw.requireSupplierForWaitingParts,
      DEFAULT_APP_SETTINGS.formGuards.requireSupplierForWaitingParts
    ),
    warnOnMissingContactInfo: getBoolean(
      raw.warnOnMissingContactInfo,
      DEFAULT_APP_SETTINGS.formGuards.warnOnMissingContactInfo
    ),
  };
}

function mapLegacyFields(value: UnknownRecord): UnknownRecord {
  const legacyCompany = isRecord(value.sirketBilgileri) ? value.sirketBilgileri : {};
  const legacyWeather = isRecord(value.weather) ? value.weather : {};

  return {
    ...value,
    company: isRecord(value.company)
      ? value.company
      : {
          name: legacyCompany.ad,
          logoUrl: legacyCompany.logoUrl,
          supportEmail: legacyCompany.email,
          supportPhone: legacyCompany.tel,
        },
    weather: {
      defaultLocationName: legacyWeather.defaultLocationName,
      defaultLatitude: legacyWeather.defaultLatitude,
      defaultLongitude: legacyWeather.defaultLongitude,
    },
  };
}

export function readSettings(): AppSettings {
  if (!fs.existsSync(SETTINGS_FILE)) {
    return DEFAULT_APP_SETTINGS;
  }

  try {
    const content = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(content) as unknown;
    const raw = isRecord(parsed) ? mapLegacyFields(parsed) : {};

    return {
      theme: parseThemeSettings(raw.theme),
      weather: parseWeatherSettings(raw.weather),
      sync: parseSyncSettings(raw.sync),
      access: parseAccessSettings(raw.access),
      company: parseCompanySettings(raw.company),
      ui: parseUiSettings(raw.ui),
      partsEta: parsePartsEtaSettings(raw.partsEta),
      formGuards: parseFormGuardSettings(raw.formGuards),
    };
  } catch (error) {
    console.error('Settings read error:', error);
    return DEFAULT_APP_SETTINGS;
  }
}

function ensureSettingsDirectory(): void {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function writeSettings(settings: AppSettings): AppSettings {
  ensureSettingsDirectory();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  return settings;
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const current = readSettings();
  const next: AppSettings = {
    theme: parseThemeSettings({ ...current.theme, ...(patch.theme ?? {}) }),
    weather: parseWeatherSettings({ ...current.weather, ...(patch.weather ?? {}) }),
    sync: parseSyncSettings({ ...current.sync, ...(patch.sync ?? {}) }),
    access: parseAccessSettings({ ...current.access, ...(patch.access ?? {}) }),
    company: parseCompanySettings({ ...current.company, ...(patch.company ?? {}) }),
    ui: parseUiSettings({ ...current.ui, ...(patch.ui ?? {}) }),
    partsEta: parsePartsEtaSettings({ ...current.partsEta, ...(patch.partsEta ?? {}) }),
    formGuards: parseFormGuardSettings({ ...current.formGuards, ...(patch.formGuards ?? {}) }),
  };

  return writeSettings(next);
}
