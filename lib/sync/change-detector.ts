/**
 * Change Detector - Detects changes between database and Google Sheets
 * for incremental synchronization
 */

import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { google } from 'googleapis';
import type { JWT } from 'google-auth-library';
import { SHEETS_CONFIG, SheetKey } from './sheet-config';
import { ChangeRecord, TRANSFORMS } from './types';

type GenericRecord = Record<string, unknown>;
type SoftDeleteSheetKey = 'PLANLAMA' | 'PERSONEL' | 'TEKNELER';

export class ChangeDetector {
  private prisma: PrismaClient;
  private auth: JWT;
  private spreadsheetId: string;

  constructor(
    serviceAccountEmail: string,
    privateKey: string,
    spreadsheetId: string
  ) {
    this.prisma = new PrismaClient();
    this.auth = new google.auth.JWT({
      email: serviceAccountEmail,
      key: privateKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    this.spreadsheetId = spreadsheetId;
  }

  /**
   * Detect all changes for a specific sheet
   */
  async detectChanges(sheetKey: SheetKey): Promise<ChangeRecord[]> {
    const config = SHEETS_CONFIG[sheetKey];
    if (!config) {
      throw new Error(`Unknown sheet: ${sheetKey}`);
    }

    const changes: ChangeRecord[] = [];

    // Get database records
    const dbRecords = await this.getDbRecords(sheetKey);
    // Get sheet records
    const sheetRecords = await this.getSheetRecords(config.sheetName, config.range);

    // Build maps for comparison
    const dbMap = new Map<string, GenericRecord>(
      dbRecords
        .map(record => [this.getRecordId(record), record] as const)
        .filter(([id]) => id.length > 0)
    );
    const sheetMap = new Map<string, GenericRecord>(
      sheetRecords
        .map(record => [this.getRecordId(record), record] as const)
        .filter(([id]) => id.length > 0)
    );

    // Check for new records in DB (not in Sheets)
    dbMap.forEach((record, id) => {
      if (!sheetMap.has(id)) {
        changes.push({
          type: 'CREATE',
          id,
          after: record,
          timestamp: new Date(),
          source: 'DB',
        });
      }
    });

    // Check for new records in Sheets (not in DB)
    sheetMap.forEach((record, id) => {
      if (!dbMap.has(id)) {
        changes.push({
          type: 'CREATE',
          id,
          after: record,
          timestamp: new Date(),
          source: 'SHEETS',
        });
      } else {
        // Check for updates
        const dbRecord = dbMap.get(id)!;
        const sheetRecord = sheetMap.get(id)!;
        const updateChange = this.compareRecords(dbRecord, sheetRecord, id);
        if (updateChange) {
          changes.push(updateChange);
        }
      }
    });

    // Check for deleted records
    const deletedInDb = await this.detectDeletedInDb(sheetKey);
    const deletedInSheets = await this.detectDeletedInSheets(sheetKey, config.sheetName);

    for (const id of deletedInDb) {
      changes.push({
        type: 'DELETE',
        id,
        before: dbMap.get(id),
        timestamp: new Date(),
        source: 'DB',
      });
    }

    for (const id of deletedInSheets) {
      changes.push({
        type: 'DELETE',
        id,
        before: sheetMap.get(id),
        timestamp: new Date(),
        source: 'SHEETS',
      });
    }

    return changes;
  }

  /**
   * Get database records for a sheet
   */
  private async getDbRecords(sheetKey: SheetKey): Promise<GenericRecord[]> {
    switch (sheetKey) {
      case 'PLANLAMA':
        return this.prisma.service.findMany({
          where: { deletedAt: null },
          orderBy: { updatedAt: 'desc' },
        });
      case 'PERSONEL':
        return this.prisma.personel.findMany({
          where: { deletedAt: null },
          orderBy: { updatedAt: 'desc' },
        });
      case 'TEKNELER':
        return this.prisma.tekne.findMany({
          where: { deletedAt: null },
          orderBy: { updatedAt: 'desc' },
        });
      case 'PUANLAMA':
        return this.prisma.servisPuan.findMany({
          orderBy: { createdAt: 'desc' },
        });
      case 'AYLIK_OZET':
        return this.prisma.aylikPerformans.findMany({
          orderBy: { updatedAt: 'desc' },
        });
      default:
        return [];
    }
  }

  /**
   * Get sheet records from Google Sheets
   */
  private async getSheetRecords(sheetName: string, range: string): Promise<GenericRecord[]> {
    const sheets = google.sheets({ version: 'v4', auth: this.auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!${range}`,
    });

    const values = response.data.values || [];
    if (values.length === 0) return [];

    // Skip header row and transform
    const headers = values[0] ?? [];
    return values.slice(1).map(row => {
      const record: GenericRecord = {};
      headers.forEach((header: string, index: number) => {
        record[header] = row[index] ?? null;
      });
      return record;
    });
  }

  /**
   * Compare two records and return update change if different
   */
  private compareRecords(
    dbRecord: GenericRecord,
    sheetRecord: GenericRecord,
    id: string
  ): ChangeRecord | null {
    const dbUpdatedAt = this.getUpdatedAtTimestamp(dbRecord);
    const sheetUpdatedAt = this.getUpdatedAtTimestamp(sheetRecord);
    if (dbUpdatedAt === null || sheetUpdatedAt === null) return null;

    // If DB is newer, it should be pushed to Sheets
    if (dbUpdatedAt > sheetUpdatedAt) {
      return {
        type: 'UPDATE',
        id,
        before: sheetRecord,
        after: dbRecord,
        timestamp: new Date(),
        source: 'DB',
      };
    }

    // If Sheets is newer,it should be pulled to DB
    if (sheetUpdatedAt > dbUpdatedAt) {
      return {
        type: 'UPDATE',
        id,
        before: dbRecord,
        after: sheetRecord,
        timestamp: new Date(),
        source: 'SHEETS',
      };
    }

    return null;
  }

  /**
   * Detect soft-deleted records in database
   */
  private async detectDeletedInDb(sheetKey: SheetKey): Promise<string[]> {
    switch (sheetKey) {
      case 'PLANLAMA':
        return this.getSoftDeletedIds('PLANLAMA');
      case 'PERSONEL':
        return this.getSoftDeletedIds('PERSONEL');
      case 'TEKNELER':
        return this.getSoftDeletedIds('TEKNELER');
      case 'PUANLAMA':
      case 'AYLIK_OZET':
        return [];
      default:
        return [];
    }
  }

  private async getSoftDeletedIds(sheetKey: SoftDeleteSheetKey): Promise<string[]> {
    switch (sheetKey) {
      case 'PLANLAMA': {
        const planlamaDeleted = await this.prisma.service.findMany({
          where: { deletedAt: { not: null } },
          select: { id: true },
        });
        return planlamaDeleted.map((p: { id: string }) => p.id);
      }
      case 'PERSONEL': {
        const personelDeleted = await this.prisma.personel.findMany({
          where: { deletedAt: { not: null } },
          select: { id: true },
        });
        return personelDeleted.map((p: { id: string }) => p.id);
      }
      case 'TEKNELER': {
        const teknelerDeleted = await this.prisma.tekne.findMany({
          where: { deletedAt: { not: null } },
          select: { id: true },
        });
        return teknelerDeleted.map((t: { id: string }) => t.id);
      }
    }
  }

  /**
   * Detect soft-deleted records in Google Sheets
   */
  private async detectDeletedInSheets(sheetKey: SheetKey, sheetName: string): Promise<string[]> {
    const config = SHEETS_CONFIG[sheetKey];
    if (!config.timestamps.deletedAt) return [];

    const sheets = google.sheets({ version: 'v4', auth: this.auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!${config.range}`,
    });

    const values = response.data.values || [];
    if (values.length === 0) return [];

    // Get header index for deleted column
    const headers = values[0];
    const deletedColIndex = headers.findIndex(
      h => h.toLowerCase().includes('silinmis') || h.toLowerCase() === 'deleted'
    );

    if (deletedColIndex === -1) return [];

    const deletedIds: string[] = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const deletedValue = row[deletedColIndex];
      if (deletedValue && deletedValue.toUpperCase() === 'TRUE') {
        deletedIds.push(row[0]); // Primary key is in first column
      }
    }

    return deletedIds;
  }

  /**
   * Apply changes from source to destination
   */
  async applyChanges(
    sheetKey: SheetKey,
    changes: ChangeRecord[],
    source: 'DB' | 'SHEETS'
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const change of changes) {
      try {
        if (source === 'DB' && change.source === 'DB') {
          await this.applyChangeToSheets(sheetKey, change);
        } else if (source === 'SHEETS' && change.source === 'SHEETS') {
          await this.applyChangeToDb(sheetKey, change);
        }
        success++;
      } catch (error) {
        console.error(`Failed to apply change ${change.id}:`, error);
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Apply change to Google Sheets
   */
  private async applyChangeToSheets(sheetKey: SheetKey, change: ChangeRecord): Promise<void> {
    const config = SHEETS_CONFIG[sheetKey];
    const sheets = google.sheets({ version: 'v4', auth: this.auth });

    if (change.type === 'DELETE') {
      // Find the row and mark as deleted
      const range = `${config.sheetName}!A1:Z`;
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range,
      });

      const values = response.data.values || [];
      const rowIndex = values.findIndex(row => row[0] === change.id);

      if (rowIndex > 0) {
        const deletedColIndex = config.columns.findIndex(
          c => c.dbField === 'deletedAt' || c.sheetColumn === config.timestamps.deletedAt
        );

        if (deletedColIndex >= 0) {
          await sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `${config.sheetName}!${String.fromCharCode(65 + deletedColIndex)}${rowIndex + 1}`,
            valueInputOption: 'RAW',
            requestBody: { values: [['TRUE']] },
          });
        }
      }
    } else {
      // CREATE or UPDATE
      const data = this.toMutationData(change.after);
      const values = this.recordToSheetRow(config, data);

      if (change.type === 'CREATE') {
        await sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: `${config.sheetName}!A:A`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [values] },
        });
      } else {
        // Find the row and update
        const range = `${config.sheetName}!A1:Z`;
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range,
        });

        const sheetValues = response.data.values || [];
        const rowIndex = sheetValues.findIndex(row => row[0] === change.id);

        if (rowIndex > 0) {
          await sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `${config.sheetName}!A${rowIndex + 1}:${String.fromCharCode(65 + config.columns.length - 1)}${rowIndex + 1}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [values] },
          });
        }
      }
    }
  }

  /**
   * Apply change to database
   */
  private async applyChangeToDb(sheetKey: SheetKey, change: ChangeRecord): Promise<void> {
    const data = this.toMutationData(change.after);
    switch (sheetKey) {
      case 'PLANLAMA':
        if (change.type === 'DELETE') {
          await this.prisma.service.update({
            where: { id: change.id },
            data: { deletedAt: new Date() },
          });
        } else {
          await this.prisma.service.upsert({
            where: { id: change.id },
            update: data as Prisma.ServiceUncheckedUpdateInput,
            create: { id: change.id, ...data } as Prisma.ServiceUncheckedCreateInput,
          });
        }
        break;
      case 'PERSONEL':
        if (change.type === 'DELETE') {
          await this.prisma.personel.update({
            where: { id: change.id },
            data: { deletedAt: new Date() },
          });
        } else {
          await this.prisma.personel.upsert({
            where: { id: change.id },
            update: data as Prisma.PersonelUncheckedUpdateInput,
            create: { id: change.id, ...data } as Prisma.PersonelUncheckedCreateInput,
          });
        }
        break;
      case 'TEKNELER':
        if (change.type === 'DELETE') {
          await this.prisma.tekne.update({
            where: { id: change.id },
            data: { deletedAt: new Date() },
          });
        } else {
          await this.prisma.tekne.upsert({
            where: { id: change.id },
            update: data as Prisma.TekneUncheckedUpdateInput,
            create: { id: change.id, ...data } as Prisma.TekneUncheckedCreateInput,
          });
        }
        break;
      case 'PUANLAMA':
        if (change.type === 'DELETE') {
          await this.prisma.servisPuan.delete({
            where: { id: change.id },
          });
        } else {
          await this.prisma.servisPuan.upsert({
            where: { id: change.id },
            update: data as Prisma.ServisPuanUncheckedUpdateInput,
            create: { id: change.id, ...data } as Prisma.ServisPuanUncheckedCreateInput,
          });
        }
        break;
      case 'AYLIK_OZET':
        if (change.type === 'DELETE') {
          await this.prisma.aylikPerformans.delete({
            where: { id: change.id },
          });
        } else {
          await this.prisma.aylikPerformans.upsert({
            where: { id: change.id },
            update: data as Prisma.AylikPerformansUncheckedUpdateInput,
            create: { id: change.id, ...data } as Prisma.AylikPerformansUncheckedCreateInput,
          });
        }
        break;
    }
  }

  /**
   * Convert database record to Google Sheets row format
   */
  private recordToSheetRow(config: typeof SHEETS_CONFIG[SheetKey], record: GenericRecord): unknown[] {
    return config.columns.map(col => {
      const value = record[col.dbField];
      if (value === null || value === undefined) return '';

      switch (col.type) {
        case 'boolean':
          return TRANSFORMS.fromBoolean(Boolean(value));
        case 'date':
          if (value instanceof Date) {
            return value.toLocaleDateString('tr-TR');
          }
          return value;
        default:
          return value;
      }
    });
  }

  private getRecordId(record: GenericRecord): string {
    const idValue = record.id;
    return typeof idValue === 'string' ? idValue : '';
  }

  private getUpdatedAtTimestamp(record: GenericRecord): number | null {
    const rawValue = record.updatedAt;
    if (!rawValue) return null;
    if (rawValue instanceof Date) return rawValue.getTime();
    if (typeof rawValue === 'string') {
      const ts = new Date(rawValue).getTime();
      return Number.isNaN(ts) ? null : ts;
    }
    return null;
  }

  private toMutationData(value: unknown): GenericRecord {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as GenericRecord;
  }

  /**
   * Cleanup resources
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

/**
 * Factory function to create ChangeDetector instance
 */
export async function createChangeDetector(): Promise<ChangeDetector | null> {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  if (!serviceAccountEmail || !privateKey || !spreadsheetId) {
    console.error('Missing Google Sheets credentials');
    return null;
  }

  return new ChangeDetector(serviceAccountEmail, privateKey, spreadsheetId);
}
