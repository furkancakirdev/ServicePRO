// ==================== SYNC TYPES ====================
// ServicePro ERP - Marlin Yatçılık
// Two-way Google Sheets <-> PostgreSQL Sync System

import type { ServisDurumu, IsTuru, PersonelUnvan } from '@/types';
import { parseDateOnlyToUtcDate } from '@/lib/date-utils';

// ==================== SHEET CONFIGURATION ====================

export interface SheetConfig {
  /** Sheet name in Google Sheets */
  sheetName: string;
  /** Cell range (e.g., 'A:Z' or 'A1:Q1000') */
  range: string;
  /** Primary key column name */
  primaryKey: string;
  /** Column mappings: DB field -> Sheet column */
  columns: ColumnMapping[];
  /** Sync strategy */
  syncStrategy: 'DB_FIRST' | 'SHEETS_FIRST' | 'MERGE';
  /** Enable soft delete tracking */
  enableSoftDelete: boolean;
  /** Timestamp column names */
  timestamps: {
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
  };
}

export interface ColumnMapping {
  /** Database field name */
  dbField: string;
  /** Sheet column letter (A, B, C, ...) */
  sheetColumn: string;
  /** Data type for transformation */
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'enum';
  /** Optional enum values (for enum types) */
  enumValues?: Record<string, string>;
  /** Required field */
  required: boolean;
  /** Transform function (optional) */
  transform?: (value: string) => unknown;
  /** Header aliases for robust column matching (normalized before comparison) */
  headerAliases?: string[];
}

// ==================== SYNC RESULT ====================

export interface SyncResult {
  /** Whether the sync was successful */
  success: boolean;
  /** Number of records created */
  created: number;
  /** Number of records updated */
  updated: number;
  /** Number of records deleted (soft) */
  deleted: number;
  /** Number of records skipped */
  skipped: number;
  /** Number of errors */
  errors: SyncError[];
  /** Sync timestamp */
  timestamp: Date;
  /** Duration in milliseconds */
  durationMs: number;
  /** Sheet name */
  sheetName: string;
  /** Sync type */
  syncType: 'FULL' | 'INCREMENTAL' | 'CLEANUP';
  /** Optional metadata for diagnostics */
  metadata?: {
    runId?: string;
    mode?: 'incremental' | 'full_reset';
    sheetKey?: string;
    warnings?: string[];
  };
}

export interface SyncError {
  /** Error type */
  type?: string;
  /** Error message */
  message: string;
  /** Record ID (if available) */
  recordId?: string;
  /** Row ID (if available) */
  rowId?: string;
  /** Record data (for debugging) */
  data?: unknown;
  /** Error code */
  code?: string;
  /** Timestamp */
  timestamp?: Date;
}

// ==================== CHANGE RECORD ====================

export interface ChangeRecord {
  /** Change type */
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  /** Record ID */
  id: string;
  /** Before state (for UPDATE/DELETE) */
  before?: unknown;
  /** After state (for CREATE/UPDATE) */
  after?: unknown;
  /** Timestamp of change */
  timestamp: Date;
  /** Source of change */
  source: 'DB' | 'SHEETS';
  /** User ID (if applicable) */
  userId?: string;
}

// ==================== SYNC LOG (DATABASE MODEL) ====================

export interface SyncLog {
  id: string;
  sheetName: string;
  syncType: 'FULL' | 'INCREMENTAL' | 'CLEANUP';
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  recordsCreated: number;
  recordsUpdated: number;
  recordsDeleted: number;
  recordsSkipped: number;
  errorCount: number;
  errorMessage?: string;
  errorDetails?: SyncError[];
  durationMs?: number;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
}

// ==================== SHEET DATA TYPES ====================

export interface PlanlamaRow {
  id: string;
  tarih: string;
  saat: string;
  tekneAdi: string;
  adres: string;
  yer: string;
  servisAciklamasi: string;
  irtibatKisi: string;
  telefon: string;
  durum: ServisDurumu;
  kapanisDurumu: string;
  kapanisId: string;
  kapanisYapan: string;
  olusturan: string;
  olusturmaTarihi: string;
  guncellestirmeTarihi: string;
  silinmis: string; // 'TRUE' | 'FALSE'
}

export interface PersonelRow {
  id: string;
  ad: string;
  unvan: PersonelUnvan;
  rol: string;
  aktif: string; // 'TRUE' | 'FALSE'
  girisYili: string;
  telefon: string;
  email: string;
  adres: string;
  aciklama: string;
  olusturmaTarihi: string;
  guncellestirmeTarihi: string;
}

export interface TekneRow {
  id: string;
  tekneAdi: string;
  seriNo: string;
  marka: string;
  model: string;
  boyut: string;
  motorTipi: string;
  motorSeriNo: string;
  yil: string;
  renk: string;
  sahibi: string;
  adres: string;
  telefon: string;
  email: string;
  aciklama: string;
  aktif: string; // 'TRUE' | 'FALSE'
  olusturmaTarihi: string;
}

export interface PuanlamaRow {
  id: string;
  servisId: string;
  personelId: string;
  personelAdi: string;
  rol: string;
  isTuru: IsTuru;
  raporBasarisi: string;
  hamPuan: string;
  zorlukCarpani: string;
  finalPuan: string;
  bonus: string; // 'TRUE' | 'FALSE'
  notlar: string;
  tarih: string;
}

export interface AylikOzetRow {
  id: string;
  personelId: string;
  personelAdi: string;
  ay: string;
  servisSayisi: string;
  sorumluServis: string;
  destekServis: string;
  bireyselPuanOrt: string;
  yetkiliPuanOrt: string;
  ismailPuani: string;
  toplamPuan: string;
  siralama: string;
  rozet: string;
}

// ==================== SYNC OPTIONS ====================

export interface SyncOptions {
  /** Sheet name (optional, if not specified sync all sheets) */
  sheetName?: string;
  /** Sync type */
  type: 'FULL' | 'INCREMENTAL' | 'CLEANUP' | 'SPECIFIC';
  /** Force full sync even for incremental */
  forceFull?: boolean;
  /** Skip validation */
  skipValidation?: boolean;
  /** Skip error logging */
  skipErrorLogging?: boolean;
  /** Custom filters */
  filters?: Record<string, unknown>;
}

export interface SyncStatus {
  /** Whether sync is currently running */
  isRunning: boolean;
  /** Last successful sync timestamp */
  lastSyncAt?: Date;
  /** Last sync type */
  lastSyncType?: 'FULL' | 'INCREMENTAL' | 'CLEANUP';
  /** Next scheduled sync */
  nextSyncAt?: Date;
  /** Recent sync logs */
  recentLogs: SyncLog[];
  /** Connection status */
  connectionOk: boolean;
  /** Last connection check */
  lastConnectionCheck?: Date;
}

// ==================== SHEET METADATA ====================

export interface SheetMetadata {
  /** Sheet ID */
  sheetId: number;
  /** Sheet title */
  title: string;
  /** Index */
  index: number;
  /** Grid properties */
  gridProperties?: {
    rowCount: number;
    columnCount: number;
  };
}

export interface SpreadsheetMetadata {
  /** Spreadsheet ID */
  spreadsheetId: string;
  /** Spreadsheet title */
  title: string;
  /** Sheets */
  sheets: SheetMetadata[];
  /** Last update time */
  updatedAt: Date;
}

// ==================== TRANSFORM FUNCTIONS ====================

export const TRANSFORMS = {
  normalizeText: (value: string): string => {
    return value
      .replace(/[İI]/g, 'I')
      .replace(/[ı]/g, 'i')
      .replace(/[Ğ]/g, 'G')
      .replace(/[ğ]/g, 'g')
      .replace(/[Ü]/g, 'U')
      .replace(/[ü]/g, 'u')
      .replace(/[Ş]/g, 'S')
      .replace(/[ş]/g, 's')
      .replace(/[Ö]/g, 'O')
      .replace(/[ö]/g, 'o')
      .replace(/[Ç]/g, 'C')
      .replace(/[ç]/g, 'c');
  },

  // Boolean transforms
  toBoolean: (value: string): boolean => value.toUpperCase() === 'TRUE',
  fromBoolean: (value: boolean): string => value ? 'TRUE' : 'FALSE',
  
  // Date transforms (DD.MM.YYYY format)
  toDate: (value: string): Date | null => {
    if (!value) return null;
    return parseDateOnlyToUtcDate(value);
  },
  fromDate: (value: Date | null): string => {
    if (!value) return '';
    return `${value.getDate().toString().padStart(2, '0')}.${(value.getMonth() + 1).toString().padStart(2, '0')}.${value.getFullYear()}`;
  },
  
  // DateTime transforms (ISO format)
  toDateTime: (value: string): Date | null => {
    if (!value) return null;
    const date = new Date(value.trim());
    return isNaN(date.getTime()) ? null : date;
  },
  fromDateTime: (value: Date | null): string => {
    if (!value) return '';
    return value.toISOString();
  },
  
  // Number transforms
  toNumber: (value: string): number | null => {
    if (!value) return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  },
  fromNumber: (value: number | null): string => {
    if (value === null || value === undefined) return '';
    return value.toString();
  },
  
  // Enum transforms
  toEnum: <T extends string>(value: string, enumValues: Record<string, T>): T | null => {
    const normalized = TRANSFORMS.normalizeText(value).toUpperCase().replace(/\s+/g, '_').trim();
    return enumValues[normalized] || null;
  },
  fromEnum: <T extends string>(value: T, enumValues: Record<string, T>): string => {
    return enumValues[value] || value;
  },
};

// ==================== SYNC STRATEGY CONFIG ====================

export const SYNC_STRATEGIES = {
  DB_FIRST: {
    description: 'Database is the source of truth. Changes in Sheets will overwrite DB if DB is newer.',
    resolveConflict: (dbTimestamp: Date | null, sheetsTimestamp: Date | null) => {
      if (!dbTimestamp) return 'SHEETS';
      if (!sheetsTimestamp) return 'DB';
      return dbTimestamp > sheetsTimestamp ? 'DB' : 'SHEETS';
    }
  },
  SHEETS_FIRST: {
    description: 'Google Sheets is the source of truth. Changes in DB will overwrite Sheets if Sheets is newer.',
    resolveConflict: (dbTimestamp: Date | null, sheetsTimestamp: Date | null) => {
      if (!sheetsTimestamp) return 'DB';
      if (!dbTimestamp) return 'SHEETS';
      return sheetsTimestamp > dbTimestamp ? 'SHEETS' : 'DB';
    }
  },
  MERGE: {
    description: 'Merge changes. Last write wins for conflicting fields.',
    resolveConflict: () => 'LAST_WRITE_WINS'
  }
};

// ==================== CONSTANTS ====================

export const SYNC_CONSTANTS = {
  DEFAULT_TIMEOUT_MS: 60000, // 60 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  BATCH_SIZE: 100, // Rows per batch
  RATE_LIMIT_DELAY_MS: 100, // Delay between API calls
  INCREMENTAL_SYNC_THRESHOLD_MS: 15 * 60 * 1000, // 15 minutes
  FULL_SYNC_THRESHOLD_MS: 60 * 60 * 1000, // 1 hour
  CLEANUP_THRESHOLD_MS: 24 * 60 * 60 * 1000, // 24 hours
};

export const SYNC_EVENTS = {
  SYNC_STARTED: 'sync:started',
  SYNC_COMPLETED: 'sync:completed',
  SYNC_FAILED: 'sync:failed',
  RECORD_CREATED: 'record:created',
  RECORD_UPDATED: 'record:updated',
  RECORD_DELETED: 'record:deleted',
  RECORD_SKIPPED: 'record:skipped',
  RECORD_ERROR: 'record:error',
  CONNECTION_CHECK: 'connection:check',
} as const;
