/**
 * Sync Manager - canonical Google Sheets -> PostgreSQL synchronization layer.
 */

import { google } from 'googleapis';
import type { JWT } from 'google-auth-library';
import { prisma } from '@/lib/prisma';
import { ServisDurumu, Prisma } from '@prisma/client';
import { SheetConfig, SyncResult, TRANSFORMS } from './types';
import { SHEETS_CONFIG, SheetKey } from './sheet-config';
import { readFile } from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import { normalizeLokasyonText } from '@/lib/domain-mappers';
import { sanitizePlanlamaRow, SanitizedPlanlamaRow } from './sync-service';
import { mapSheetStatusToDbStatus } from './utils/status-mapper';
import { parseSmartDateToUtcDate } from './utils/smart-date-parser';

type SyncMode = 'incremental' | 'full_reset';
const DEFAULT_SPREADSHEET_ID = '1IGa23ZXugvCGblp4GtE2Tl06Z2mnZ2VxIM_F6vyolVs';

type SyncRunSummary = {
  runId: string;
  mode: SyncMode;
  startedAt: string;
  finishedAt?: string;
  success?: boolean;
  totals?: {
    created: number;
    updated: number;
    deleted: number;
    skipped: number;
    errors: number;
  };
  errors?: { sheet?: string; message: string }[];
};

const HEADER_NORMALIZE_RE = /[^A-Z0-9]/g;

function normalizeHeader(value: string): string {
  const normalized = TRANSFORMS.normalizeText(value || '').toUpperCase();
  return normalized.replace(HEADER_NORMALIZE_RE, '');
}

function columnLetterToIndex(letter: string): number {
  const clean = (letter || '').trim().toUpperCase();
  if (!/^[A-Z]+$/.test(clean)) return -1;
  let result = 0;
  for (let i = 0; i < clean.length; i++) {
    result = result * 26 + (clean.charCodeAt(i) - 64);
  }
  return result - 1;
}

function parseSheetRowToStrings(row: unknown[]): string[] {
  return row.map((v) => (v == null ? '' : String(v).trim()));
}

function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  const compact = phone.replace(/\s+/g, ' ').trim();
  return compact.length ? compact : null;
}

function normalizeStatus(value: unknown): ServisDurumu {
  return mapSheetStatusToDbStatus(value).status;
}

export class SyncManager {
  private auth: JWT;
  private spreadsheetId: string;
  private static lastRun: SyncRunSummary | null = null;

  constructor(serviceAccountEmail: string, privateKey: string, spreadsheetId: string) {
    this.auth = new google.auth.JWT({
      email: serviceAccountEmail,
      key: privateKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    this.spreadsheetId = spreadsheetId;
  }

  static getLastRun(): SyncRunSummary | null {
    return SyncManager.lastRun;
  }

  async syncAllFromSheets(mode: SyncMode = 'incremental'): Promise<Record<string, SyncResult>> {
    const runId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    SyncManager.lastRun = { runId, mode, startedAt };

    const results: Record<string, SyncResult> = {};
    const entries = Object.entries(SHEETS_CONFIG) as [SheetKey, SheetConfig][];

    for (const [sheetKey] of entries) {
      results[sheetKey] = await this.syncFromSheets(sheetKey, { mode, runId });
    }

    const totals = Object.values(results).reduce(
      (acc, r) => ({
        created: acc.created + r.created,
        updated: acc.updated + r.updated,
        deleted: acc.deleted + r.deleted,
        skipped: acc.skipped + r.skipped,
        errors: acc.errors + r.errors.length,
      }),
      { created: 0, updated: 0, deleted: 0, skipped: 0, errors: 0 }
    );

    SyncManager.lastRun = {
      runId,
      mode,
      startedAt,
      finishedAt: new Date().toISOString(),
      success: totals.errors === 0,
      totals,
      errors: Object.entries(results)
        .flatMap(([sheet, r]) => r.errors.map((e) => ({ sheet, message: e.message }))),
    };

    return results;
  }

  async syncFromSheets(
    sheetKey: SheetKey,
    options: { mode?: SyncMode; runId?: string } = {}
  ): Promise<SyncResult> {
    const mode = options.mode ?? 'incremental';
    const runId = options.runId ?? crypto.randomUUID();
    const started = Date.now();
    const config = SHEETS_CONFIG[sheetKey];

    if (!config) {
      return {
        success: false,
        created: 0,
        updated: 0,
        deleted: 0,
        skipped: 0,
        errors: [{ message: `Unknown sheet: ${sheetKey}`, type: 'CONFIG_ERROR' }],
        timestamp: new Date(),
        durationMs: Date.now() - started,
        sheetName: sheetKey,
        syncType: 'FULL',
        metadata: { runId, mode, sheetKey },
      };
    }

    try {
      const rows = await this.readSheetData(config.sheetName, config.range);
      if (!rows.length) {
        return {
          success: true,
          created: 0,
          updated: 0,
          deleted: 0,
          skipped: 0,
          errors: [],
          timestamp: new Date(),
          durationMs: Date.now() - started,
          sheetName: config.sheetName,
          syncType: mode === 'full_reset' ? 'FULL' : 'INCREMENTAL',
          metadata: { runId, mode, sheetKey },
        };
      }

      const [headerRow, ...rawDataRows] = rows;
      const headers = parseSheetRowToStrings(headerRow);
      const resolution = this.resolveColumnIndexes(config, headers);

      if (!resolution.success) {
        const headerReport = config.columns.map((column) => {
          const expectedIdx = columnLetterToIndex(column.sheetColumn);
          const currentIdx = resolution.indexMap.get(column.dbField) ?? -1;
          return {
            field: column.dbField,
            expectedColumn: column.sheetColumn,
            expectedHeader: expectedIdx >= 0 ? headers[expectedIdx] ?? null : null,
            resolvedColumn: currentIdx >= 0 ? currentIdx + 1 : null,
            resolvedHeader: currentIdx >= 0 ? headers[currentIdx] ?? null : null,
          };
        });

        return {
          success: false,
          created: 0,
          updated: 0,
          deleted: 0,
          skipped: rawDataRows.length,
          errors: resolution.errors.map((message) => ({
            message,
            type: 'COLUMN_SHIFT_DETECTED',
            data: { headers, headerReport },
          })),
          timestamp: new Date(),
          durationMs: Date.now() - started,
          sheetName: config.sheetName,
          syncType: mode === 'full_reset' ? 'FULL' : 'INCREMENTAL',
          metadata: { runId, mode, sheetKey },
        };
      }

      if (sheetKey === 'PLANLAMA') {
        const transformedRows = rawDataRows
          .map((row) => this.transformRowData(config, row, resolution.indexMap))
          .filter((row) => row.tekneAdi && row.servisAciklamasi);

        if (mode === 'full_reset') {
          const fullResetResult = await this.runPlanlamaFullReset(transformedRows, runId);
          fullResetResult.durationMs = Date.now() - started;
          if (resolution.warnings.length) {
            fullResetResult.metadata = {
              ...(fullResetResult.metadata ?? {}),
              warnings: resolution.warnings,
            };
          }
          return fullResetResult;
        }

        const incrementalResult = await this.runPlanlamaIncremental(transformedRows, runId);
        incrementalResult.durationMs = Date.now() - started;
        if (resolution.warnings.length) {
          incrementalResult.metadata = {
            ...(incrementalResult.metadata ?? {}),
            warnings: resolution.warnings,
          };
        }
        return incrementalResult;
      }

      const genericResult = await this.runGenericSync(sheetKey, config, rawDataRows, resolution.indexMap, runId, mode);
      genericResult.durationMs = Date.now() - started;
      return genericResult;
    } catch (error) {
      return {
        success: false,
        created: 0,
        updated: 0,
        deleted: 0,
        skipped: 0,
        errors: [{ message: error instanceof Error ? error.message : 'Unknown sync error', type: 'SYNC_ERROR' }],
        timestamp: new Date(),
        durationMs: Date.now() - started,
        sheetName: config.sheetName,
        syncType: mode === 'full_reset' ? 'FULL' : 'INCREMENTAL',
        metadata: { runId, mode, sheetKey },
      };
    }
  }

  async validatePlanlamaAgainstDb(options: { sampleLimit?: number; includeAllSamples?: boolean } = {}) {
    const sampleLimit = options.includeAllSamples
      ? Number.MAX_SAFE_INTEGER
      : Math.max(1, Math.min(options.sampleLimit ?? 50, 500));
    const config = SHEETS_CONFIG.PLANLAMA;

    const rows = await this.readSheetData(config.sheetName, config.range);
    if (!rows.length) {
      return {
        ok: true,
        sheetName: config.sheetName,
        summary: {
          totalSheetRows: 0,
          effectiveSheetRows: 0,
          dbRowsChecked: 0,
          missingInDbCount: 0,
          extraInDbCount: 0,
          mismatchedCount: 0,
          skippedByStatusCount: 0,
          invalidRowCount: 0,
          criticalMismatchCount: 0,
        },
        mismatchByField: {},
        samples: {
          missingInDb: [],
          extraInDb: [],
          mismatched: [],
        },
      };
    }

    const [headerRow, ...rawDataRows] = rows;
    const headers = parseSheetRowToStrings(headerRow);
    const resolution = this.resolveColumnIndexes(config, headers);

    if (!resolution.success) {
      const headerReport = config.columns.map((column) => {
        const expectedIdx = columnLetterToIndex(column.sheetColumn);
        const currentIdx = resolution.indexMap.get(column.dbField) ?? -1;
        return {
          field: column.dbField,
          expectedColumn: column.sheetColumn,
          expectedHeader: expectedIdx >= 0 ? headers[expectedIdx] ?? null : null,
          resolvedColumn: currentIdx >= 0 ? currentIdx + 1 : null,
          resolvedHeader: currentIdx >= 0 ? headers[currentIdx] ?? null : null,
        };
      });

      return {
        ok: false,
        sheetName: config.sheetName,
        error: 'COLUMN_SHIFT_DETECTED',
        details: resolution.errors,
        headers,
        headerReport,
      };
    }

    let skippedByStatusCount = 0;
    let invalidRowCount = 0;
    const sanitizedRows = rawDataRows
      .map((row) => this.transformRowData(config, row, resolution.indexMap))
      .map((row) => this.sanitizePlanlamaRecord(row));

    const effectiveRows = sanitizedRows.filter((row) => {
      if (row.skipReason === 'MISSING_REQUIRED') {
        invalidRowCount++;
        return false;
      }
      if (row.skipReason === 'STATUS_FILTERED') {
        skippedByStatusCount++;
        return false;
      }
      if (!row.id || !row.tekneAdi || !row.servisAciklamasi) {
        invalidRowCount++;
        return false;
      }
      return true;
    });

    const uniqueRows = Array.from(new Map(effectiveRows.map((row) => [row.id, row])).values());
    invalidRowCount += effectiveRows.length - uniqueRows.length;

    const dbRows = await prisma.service.findMany({
      where: { id: { in: uniqueRows.map((row) => row.id) } },
      select: {
        id: true,
        tarih: true,
        saat: true,
        tekneAdi: true,
        adres: true,
        yer: true,
        servisAciklamasi: true,
        telefon: true,
        durum: true,
        deletedAt: true,
      },
    });

    const dbMap = new Map(dbRows.map((row) => [row.id, row]));
    const missingInDb: string[] = [];
    const mismatched: Array<{
      id: string;
      diffs: Array<{ field: string; sheet: string | null; db: string | null }>;
    }> = [];
    const mismatchByField: Record<string, number> = {};
    const criticalFields = new Set(['tarih', 'adres', 'yer', 'durum']);

    for (const row of uniqueRows) {
      const db = dbMap.get(row.id);
      if (!db) {
        missingInDb.push(row.id);
        continue;
      }

      const sheetSnapshot = {
        tarih: this.toDateOnlyISOString(row.tarih),
        saat: row.saat ?? null,
        tekneAdi: row.tekneAdi,
        adres: row.adres,
        yer: row.yer,
        servisAciklamasi: row.servisAciklamasi,
        telefon: row.telefon ?? null,
        durum: String(row.durum),
      };
      const dbSnapshot = {
        tarih: this.toDateOnlyISOString(db.tarih),
        saat: db.saat ?? null,
        tekneAdi: db.tekneAdi,
        adres: db.adres,
        yer: db.yer,
        servisAciklamasi: db.servisAciklamasi,
        telefon: normalizePhone(db.telefon),
        durum: String(normalizeStatus(db.durum)),
      };

      const diffs: Array<{ field: string; sheet: string | null; db: string | null }> = [];
      (Object.keys(sheetSnapshot) as Array<keyof typeof sheetSnapshot>).forEach((field) => {
        if (sheetSnapshot[field] !== dbSnapshot[field]) {
          diffs.push({
            field,
            sheet: sheetSnapshot[field],
            db: dbSnapshot[field],
          });
        }
      });

      if (diffs.length > 0) {
        diffs.forEach((diff) => {
          mismatchByField[diff.field] = (mismatchByField[diff.field] ?? 0) + 1;
        });
        mismatched.push({ id: row.id, diffs });
      }
    }

    const dbActiveRows = await prisma.service.findMany({
      where: {
        deletedAt: null,
        NOT: {
          durum: {
            in: [ServisDurumu.TAMAMLANDI, ServisDurumu.KESIF_KONTROL],
          },
        },
        id: { startsWith: 'sheet-svc-' },
      },
      select: { id: true },
    });
    const sheetIdSet = new Set(uniqueRows.map((row) => row.id));
    const extraInDb = dbActiveRows
      .map((row) => row.id)
      .filter((id) => !sheetIdSet.has(id));

    const criticalMismatchCount = mismatched.filter((entry) =>
      entry.diffs.some((diff) => criticalFields.has(diff.field))
    ).length;

    return {
      ok: true,
      sheetName: config.sheetName,
      summary: {
        totalSheetRows: rawDataRows.length,
        effectiveSheetRows: uniqueRows.length,
        dbRowsChecked: dbRows.length,
        missingInDbCount: missingInDb.length,
        extraInDbCount: extraInDb.length,
        mismatchedCount: mismatched.length,
        skippedByStatusCount,
        invalidRowCount,
        criticalMismatchCount,
      },
      mismatchByField,
      samples: {
        missingInDb: missingInDb.slice(0, sampleLimit),
        extraInDb: extraInDb.slice(0, sampleLimit),
        mismatched: mismatched.slice(0, sampleLimit),
      },
    };
  }

  private sanitizePlanlamaRecord(row: Record<string, unknown>): SanitizedPlanlamaRow {
    return sanitizePlanlamaRow(row, (candidateRow) => this.generatePlanlamaServiceId(candidateRow));
  }

  private async runPlanlamaIncremental(rows: Record<string, unknown>[], runId: string): Promise<SyncResult> {
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: SyncResult['errors'] = [];
    const preparedRows: Array<{
      id: string;
      tekneId: string;
      payload: Prisma.ServiceUncheckedCreateInput;
    }> = [];
    const tekneIds = new Map<string, { ad: string; adres: string; telefon: string | null }>();

    for (const row of rows) {
      const sanitized = this.sanitizePlanlamaRecord(row);
      if (sanitized.skipReason !== 'NONE') {
        skipped++;
        continue;
      }

      const tekneId = `sheet-tekne-${sanitized.tekneAdi.toLowerCase()}`;
      tekneIds.set(tekneId, {
        ad: sanitized.tekneAdi,
        adres: sanitized.adres,
        telefon: sanitized.telefon,
      });

      preparedRows.push({
        id: sanitized.id,
        tekneId,
        payload: {
          id: sanitized.id,
          tarih: sanitized.tarih,
          saat: sanitized.saat,
          tekneId,
          tekneAdi: sanitized.tekneAdi,
          adres: sanitized.adres,
          yer: sanitized.yer,
          servisAciklamasi: sanitized.servisAciklamasi,
          irtibatKisi: sanitized.irtibatKisi,
          telefon: sanitized.telefon,
          durum: sanitized.durum,
          isTuru: 'PAKET',
          deletedAt: null,
        },
      });
    }

    const uniquePreparedRows = Array.from(
      new Map(preparedRows.map((row) => [row.id, row])).values()
    );
    skipped += preparedRows.length - uniquePreparedRows.length;

    const existingTekneler = await prisma.tekne.findMany({
      where: { id: { in: Array.from(tekneIds.keys()) } },
      select: { id: true, ad: true, adres: true, telefon: true, aktif: true },
    });
    const existingTekneMap = new Map(existingTekneler.map((t) => [t.id, t]));

    for (const [tekneId, tekne] of Array.from(tekneIds.entries())) {
      try {
        const existingTekne = existingTekneMap.get(tekneId);
        if (
          existingTekne &&
          existingTekne.ad === tekne.ad &&
          (existingTekne.adres ?? '') === tekne.adres &&
          (existingTekne.telefon ?? null) === tekne.telefon &&
          existingTekne.aktif === true
        ) {
          continue;
        }

        await prisma.tekne.upsert({
          where: { id: tekneId },
          update: {
            ad: tekne.ad,
            adres: tekne.adres,
            telefon: tekne.telefon,
            aktif: true,
          },
          create: {
            id: tekneId,
            ad: tekne.ad,
            adres: tekne.adres,
            telefon: tekne.telefon,
            aktif: true,
          },
        });
      } catch (error) {
        errors.push({
          type: 'ROW_ERROR',
          rowId: tekneId,
          message: error instanceof Error ? error.message : 'Unknown tekne upsert error',
        });
      }
    }

    const existingServices = await prisma.service.findMany({
      where: { id: { in: uniquePreparedRows.map((r) => r.id) } },
      select: {
        id: true,
        tarih: true,
        saat: true,
        tekneId: true,
        tekneAdi: true,
        adres: true,
        yer: true,
        servisAciklamasi: true,
        irtibatKisi: true,
        telefon: true,
        durum: true,
        isTuru: true,
        deletedAt: true,
      },
    });
    const existingMap = new Map(existingServices.map((s) => [s.id, s]));

    for (const row of uniquePreparedRows) {
      try {
        const existing = existingMap.get(row.id);
        if (!existing) {
          await prisma.service.create({ data: row.payload });
          created++;
          continue;
        }

        if (this.isSameServicePayload(existing, row.payload)) {
          skipped++;
          continue;
        }

        await prisma.service.update({
          where: { id: row.id },
          data: row.payload as Prisma.ServiceUncheckedUpdateInput,
        });
        updated++;
      } catch (error) {
        errors.push({
          type: 'ROW_ERROR',
          rowId: row.id,
          message: error instanceof Error ? error.message : 'Unknown row error',
        });
      }
    }

    return {
      success: errors.length === 0,
      created,
      updated,
      deleted: 0,
      skipped,
      errors,
      timestamp: new Date(),
      durationMs: 0,
      sheetName: SHEETS_CONFIG.PLANLAMA.sheetName,
      syncType: 'INCREMENTAL',
      metadata: { runId, mode: 'incremental', sheetKey: 'PLANLAMA' },
    };
  }

  private async runPlanlamaFullReset(rows: Record<string, unknown>[], runId: string): Promise<SyncResult> {
    const errors: SyncResult['errors'] = [];
    let created = 0;
    const updated = 0;
    let skipped = 0;

    const deletedServices = await prisma.service.deleteMany({});
    await prisma.tekne.updateMany({
      where: { id: { startsWith: 'sheet-tekne-' } },
      data: { aktif: false },
    });
    const preparedRows: Array<{
      id: string;
      payload: Prisma.ServiceUncheckedCreateInput;
      tekneId: string;
      tekneAdi: string;
      tekneAdres: string;
      tekneTelefon: string | null;
    }> = [];

    for (const row of rows) {
      const sanitized = this.sanitizePlanlamaRecord(row);
      if (sanitized.skipReason !== 'NONE') {
        skipped++;
        continue;
      }

      const tekneId = `sheet-tekne-${sanitized.tekneAdi.toLowerCase()}`;
      preparedRows.push({
        id: sanitized.id,
        tekneId,
        tekneAdi: sanitized.tekneAdi,
        tekneAdres: sanitized.adres,
        tekneTelefon: sanitized.telefon,
        payload: {
          id: sanitized.id,
          tarih: sanitized.tarih,
          saat: sanitized.saat,
          tekneId,
          tekneAdi: sanitized.tekneAdi,
          adres: sanitized.adres,
          yer: sanitized.yer,
          servisAciklamasi: sanitized.servisAciklamasi,
          irtibatKisi: sanitized.irtibatKisi,
          telefon: sanitized.telefon,
          durum: sanitized.durum,
          isTuru: 'PAKET',
        },
      });
    }

    const uniqueRows = Array.from(new Map(preparedRows.map((row) => [row.id, row])).values());
    skipped += preparedRows.length - uniqueRows.length;

    for (const row of uniqueRows) {
      try {
        await prisma.tekne.upsert({
          where: { id: row.tekneId },
          update: {
            ad: row.tekneAdi,
            adres: row.tekneAdres,
            telefon: row.tekneTelefon,
            aktif: true,
          },
          create: {
            id: row.tekneId,
            ad: row.tekneAdi,
            adres: row.tekneAdres,
            telefon: row.tekneTelefon,
            aktif: true,
          },
        });

        await prisma.service.create({ data: row.payload });
        created++;
      } catch (error) {
        errors.push({
          type: 'ROW_ERROR',
          rowId: row.id,
          message: error instanceof Error ? error.message : 'Unknown row error',
        });
      }
    }

    return {
      success: errors.length === 0,
      created,
      updated,
      deleted: deletedServices.count,
      skipped,
      errors,
      timestamp: new Date(),
      durationMs: 0,
      sheetName: SHEETS_CONFIG.PLANLAMA.sheetName,
      syncType: 'FULL',
      metadata: { runId, mode: 'full_reset', sheetKey: 'PLANLAMA' },
    };
  }

  private async runGenericSync(
    sheetKey: SheetKey,
    config: SheetConfig,
    rows: unknown[][],
    indexMap: Map<string, number>,
    runId: string,
    mode: SyncMode
  ): Promise<SyncResult> {
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let deleted = 0;
    const errors: SyncResult['errors'] = [];

    if (mode === 'full_reset' && sheetKey === 'PERSONEL') {
      const deletedResult = await prisma.personel.deleteMany({});
      deleted = deletedResult.count;
    }

    for (const row of rows) {
      const transformed = this.transformRowData(config, row, indexMap);
      const id = String(transformed.id || '').trim();
      if (!id) {
        skipped++;
        continue;
      }

      try {
        switch (sheetKey) {
          case 'PERSONEL': {
            const existing = await prisma.personel.findUnique({ where: { id } });
            const data: Prisma.PersonelUncheckedCreateInput = {
              id,
              ad: String(transformed.ad || ''),
              unvan: String(transformed.unvan || 'CIRAK') as Prisma.PersonelUncheckedCreateInput['unvan'],
              rol: String(transformed.rol || 'teknisyen'),
              aktif: Boolean(transformed.aktif ?? true),
              girisYili: (transformed.girisYili as number | null) ?? null,
              telefon: normalizePhone(transformed.telefon as string | null),
              email: transformed.email ? String(transformed.email) : null,
              adres: transformed.adres ? String(transformed.adres) : null,
              aciklama: transformed.aciklama ? String(transformed.aciklama) : null,
            };
            if (existing) {
              await prisma.personel.update({ where: { id }, data: data as Prisma.PersonelUncheckedUpdateInput });
              updated++;
            } else {
              await prisma.personel.create({ data });
              created++;
            }
            break;
          }
          case 'TEKNELER': {
            const existing = await prisma.tekne.findUnique({ where: { id } });
            const data: Prisma.TekneUncheckedCreateInput = {
              id,
              ad: String(transformed.ad || ''),
              seriNo: transformed.seriNo ? String(transformed.seriNo) : null,
              marka: transformed.marka ? String(transformed.marka) : null,
              model: transformed.model ? String(transformed.model) : null,
              boyut: (transformed.boyut as number | null) ?? null,
              motorTipi: transformed.motorTipi ? String(transformed.motorTipi) : null,
              motorSeriNo: transformed.motorSeriNo ? String(transformed.motorSeriNo) : null,
              yil: (transformed.yil as number | null) ?? null,
              renk: transformed.renk ? String(transformed.renk) : null,
              mulkiyet: transformed.mulkiyet ? String(transformed.mulkiyet) : null,
              adres: transformed.adres ? String(transformed.adres) : null,
              telefon: normalizePhone(transformed.telefon as string | null),
              email: transformed.email ? String(transformed.email) : null,
              aciklama: transformed.aciklama ? String(transformed.aciklama) : null,
              aktif: Boolean(transformed.aktif ?? true),
            };
            if (existing) {
              await prisma.tekne.update({ where: { id }, data: data as Prisma.TekneUncheckedUpdateInput });
              updated++;
            } else {
              await prisma.tekne.create({ data });
              created++;
            }
            break;
          }
          default:
            skipped++;
            break;
        }
      } catch (error) {
        errors.push({
          type: 'ROW_ERROR',
          rowId: id,
          message: error instanceof Error ? error.message : 'Unknown row error',
        });
      }
    }

    return {
      success: errors.length === 0,
      created,
      updated,
      deleted,
      skipped,
      errors,
      timestamp: new Date(),
      durationMs: 0,
      sheetName: config.sheetName,
      syncType: mode === 'full_reset' ? 'FULL' : 'INCREMENTAL',
      metadata: { runId, mode, sheetKey },
    };
  }

  private resolveColumnIndexes(config: SheetConfig, headers: string[]) {
    const normalizedHeaders = headers.map(normalizeHeader);
    const indexMap = new Map<string, number>();
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const column of config.columns) {
      const fallbackIdx = columnLetterToIndex(column.sheetColumn);
      let chosenIdx = fallbackIdx;
      const aliases = (column.headerAliases ?? []).map(normalizeHeader).filter(Boolean);

      if (aliases.length > 0 && normalizedHeaders.length > 0) {
        const foundByAlias = normalizedHeaders.findIndex((h) => aliases.includes(h));
        if (foundByAlias >= 0) {
          chosenIdx = foundByAlias;
        } else {
          const fallbackHeader = normalizedHeaders[fallbackIdx] ?? '(missing)';
          errors.push(
            `Header not found for '${column.dbField}': expected one of [${aliases.join(', ')}], fallback ${column.sheetColumn} has '${fallbackHeader}'`
          );
        }
      }

      if (chosenIdx < 0 || chosenIdx >= Math.max(headers.length, 1)) {
        errors.push(`Invalid column index for '${column.dbField}'`);
      } else if (aliases.length > 0) {
        const actual = normalizedHeaders[chosenIdx] ?? '';
        if (!aliases.includes(actual)) {
          errors.push(
            `Header mismatch for '${column.dbField}': got '${actual || '(empty)'}', expected one of [${aliases.join(', ')}]`
          );
        }
      }

      if (aliases.length > 0 && chosenIdx !== fallbackIdx && this.isValidHeaderIndex(normalizedHeaders, fallbackIdx)) {
        warnings.push(
          `Column '${column.dbField}' resolved by header at ${chosenIdx + 1} (fallback ${column.sheetColumn})`
        );
      }

      indexMap.set(column.dbField, chosenIdx);
    }

    return {
      success: errors.length === 0,
      indexMap,
      errors,
      warnings,
    };
  }

  private transformRowData(config: SheetConfig, row: unknown[], indexMap: Map<string, number>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const column of config.columns) {
      const idx = indexMap.get(column.dbField) ?? columnLetterToIndex(column.sheetColumn);
      const raw = row[idx];
      const value = raw == null ? '' : String(raw).trim();

      if (!value) {
        if (column.required) result[column.dbField] = this.getDefaultValue(column.type);
        continue;
      }

      if (column.transform) {
        const transformed = column.transform(value);
        result[column.dbField] = transformed ?? value;
        continue;
      }

      switch (column.type) {
        case 'string':
          result[column.dbField] = value;
          break;
        case 'number':
          result[column.dbField] = TRANSFORMS.toNumber(value);
          break;
        case 'boolean':
          result[column.dbField] = TRANSFORMS.toBoolean(value);
          break;
        case 'date':
          result[column.dbField] = TRANSFORMS.toDate(value);
          break;
        case 'datetime':
          result[column.dbField] = TRANSFORMS.toDateTime(value);
          break;
        case 'enum':
          result[column.dbField] = TRANSFORMS.toEnum(value, column.enumValues || {}) ?? value;
          break;
        default:
          result[column.dbField] = value;
      }
    }

    return result;
  }

  private normalizePlanlamaDate(value: unknown): Date | null {
    return parseSmartDateToUtcDate(value).date;
  }

  private generatePlanlamaServiceId(row: Record<string, unknown>): string {
    const normalizedDate = this.normalizePlanlamaDate(row.tarih);
    const datePart = normalizedDate
      ? normalizedDate.toISOString().slice(0, 10)
      : String(row.tarih || '').trim();
    const base = [
      datePart,
      String(row.tekneAdi || '').trim(),
      normalizeLokasyonText(row.adres),
      normalizeLokasyonText(row.yer),
      String(row.servisAciklamasi || '').trim(),
      String(row.irtibatKisi || '').trim(),
      String(row.telefon || '').trim(),
    ].join('|');
    const digest = createHash('sha1').update(base).digest('hex').slice(0, 16);
    return `sheet-svc-${digest}`;
  }

  private toDateOnlyISOString(value: Date | null): string | null {
    if (!value || Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }

  private isSameServicePayload(
    existing: {
      tarih: Date | null;
      saat: string | null;
      tekneId: string;
      tekneAdi: string;
      adres: string;
      yer: string;
      servisAciklamasi: string;
      irtibatKisi: string | null;
      telefon: string | null;
      durum: ServisDurumu;
      isTuru: 'PAKET' | 'ARIZA' | 'PROJE';
      deletedAt: Date | null;
    },
    payload: Prisma.ServiceUncheckedCreateInput
  ): boolean {
    const existingDate = this.toDateOnlyISOString(existing.tarih);
    const payloadDate = payload.tarih instanceof Date ? this.toDateOnlyISOString(payload.tarih) : null;

    return (
      existingDate === payloadDate &&
      (existing.saat ?? null) === (payload.saat ?? null) &&
      existing.tekneId === payload.tekneId &&
      existing.tekneAdi === payload.tekneAdi &&
      existing.adres === payload.adres &&
      existing.yer === payload.yer &&
      existing.servisAciklamasi === payload.servisAciklamasi &&
      (existing.irtibatKisi ?? null) === (payload.irtibatKisi ?? null) &&
      (existing.telefon ?? null) === (payload.telefon ?? null) &&
      existing.durum === payload.durum &&
      existing.isTuru === payload.isTuru &&
      existing.deletedAt === (payload.deletedAt ?? null)
    );
  }

  private getDefaultValue(type: string): string | number | boolean | null {
    switch (type) {
      case 'string':
        return '';
      case 'number':
        return 0;
      case 'boolean':
        return false;
      default:
        return null;
    }
  }

  private isValidHeaderIndex(headers: string[], index: number): boolean {
    return index >= 0 && index < headers.length;
  }

  private async readSheetData(sheetName: string, range: string): Promise<unknown[][]> {
    const sheets = google.sheets({ version: 'v4', auth: this.auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!${range}`,
    });
    return response.data.values || [];
  }
}

export async function createSyncManager(): Promise<SyncManager | null> {
  let serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
  const spreadsheetId =
    process.env.GOOGLE_SPREADSHEET_ID ||
    process.env.GOOGLE_SHEETS_ID ||
    DEFAULT_SPREADSHEET_ID;

  // JSON dosyasından credentials okuma - birden fazla path dene
  if ((!serviceAccountEmail || !privateKey) && process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const jsonPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const pathsToTry = [
      path.resolve(process.cwd(), jsonPath),
      path.resolve(process.cwd(), '..', jsonPath),
      path.resolve(__dirname, '../../..', jsonPath),
      path.resolve(__dirname, '../..', jsonPath),
    ];

    for (const credentialPath of pathsToTry) {
      try {
        const raw = await readFile(credentialPath, 'utf-8');
        const json = JSON.parse(raw) as { client_email?: string; private_key?: string };
        if (json.client_email || json.private_key) {
          serviceAccountEmail = serviceAccountEmail || json.client_email || '';
          privateKey = privateKey || json.private_key || '';
          console.log(`Google credentials loaded from: ${credentialPath}`);
          break;
        }
      } catch (error) {
        // Son deneme değilse hata gösterme
        if (credentialPath === pathsToTry[pathsToTry.length - 1]) {
          console.error('Failed to read GOOGLE_SERVICE_ACCOUNT_JSON from all paths:', {
            pathsAttempted: pathsToTry,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }
  }

  if (!serviceAccountEmail || !privateKey || !spreadsheetId) {
    console.error('Missing Google Sheets credentials:', {
      hasEmail: !!serviceAccountEmail,
      hasPrivateKey: !!privateKey,
      hasSpreadsheetId: !!spreadsheetId,
    });
    return null;
  }

  return new SyncManager(serviceAccountEmail, privateKey, spreadsheetId);
}
