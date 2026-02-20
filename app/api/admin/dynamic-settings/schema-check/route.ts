import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/api-auth';

type TabloRow = { table_name: string };
type KolonRow = { table_name: string; column_name: string };
type ForeignKeyRow = {
  table_name: string;
  column_name: string;
  foreign_table_name: string;
};
type IndexRow = { indexname: string };

const BEKLENEN_TABLOLAR = [
  'servis_durumlari',
  'konumlar',
  'blokaj_nedenleri',
  'personel_unvanlari',
  'system_settings',
] as const;

const BEKLENEN_KOLONLAR = [
  { table: 'personel', column: 'unvan_id' },
  { table: 'servis', column: 'durum_id' },
  { table: 'servis', column: 'konum_id' },
] as const;

const BEKLENEN_FK = [
  { table: 'personel', column: 'unvan_id', foreignTable: 'personel_unvanlari' },
  { table: 'servis', column: 'durum_id', foreignTable: 'servis_durumlari' },
  { table: 'servis', column: 'konum_id', foreignTable: 'konumlar' },
] as const;

const BEKLENEN_INDEXLER = [
  'personel_unvan_id_idx',
  'servis_durum_id_idx',
  'servis_konum_id_idx',
] as const;

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, ['ADMIN']);
  if (!auth.ok) return auth.response;

  try {
    const [tablolar, kolonlar, foreignKeys, indexler] = await Promise.all([
      prisma.$queryRaw<TabloRow[]>`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('servis_durumlari', 'konumlar', 'blokaj_nedenleri', 'personel_unvanlari', 'system_settings')
      `,
      prisma.$queryRaw<KolonRow[]>`
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND (
            (table_name = 'personel' AND column_name = 'unvan_id')
            OR (table_name = 'servis' AND column_name IN ('durum_id', 'konum_id'))
          )
      `,
      prisma.$queryRaw<ForeignKeyRow[]>`
        SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
         AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND (
            (tc.table_name = 'personel' AND kcu.column_name = 'unvan_id')
            OR (tc.table_name = 'servis' AND kcu.column_name IN ('durum_id', 'konum_id'))
          )
      `,
      prisma.$queryRaw<IndexRow[]>`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname IN ('personel_unvan_id_idx', 'servis_durum_id_idx', 'servis_konum_id_idx')
      `,
    ]);

    const tabloSet = new Set(tablolar.map((satir) => satir.table_name));
    const kolonSet = new Set(kolonlar.map((satir) => `${satir.table_name}.${satir.column_name}`));
    const fkSet = new Set(
      foreignKeys.map(
        (satir) => `${satir.table_name}.${satir.column_name}->${satir.foreign_table_name}`
      )
    );
    const indexSet = new Set(indexler.map((satir) => satir.indexname));

    const tabloKontrol = Object.fromEntries(
      BEKLENEN_TABLOLAR.map((tablo) => [tablo, tabloSet.has(tablo)])
    );
    const kolonKontrol = Object.fromEntries(
      BEKLENEN_KOLONLAR.map((kolon) => [
        `${kolon.table}.${kolon.column}`,
        kolonSet.has(`${kolon.table}.${kolon.column}`),
      ])
    );
    const fkKontrol = Object.fromEntries(
      BEKLENEN_FK.map((fk) => [
        `${fk.table}.${fk.column}->${fk.foreignTable}`,
        fkSet.has(`${fk.table}.${fk.column}->${fk.foreignTable}`),
      ])
    );
    const indexKontrol = Object.fromEntries(
      BEKLENEN_INDEXLER.map((indexAdi) => [indexAdi, indexSet.has(indexAdi)])
    );

    const allChecksPassed =
      Object.values(tabloKontrol).every(Boolean) &&
      Object.values(kolonKontrol).every(Boolean) &&
      Object.values(fkKontrol).every(Boolean) &&
      Object.values(indexKontrol).every(Boolean);

    return NextResponse.json(
      {
        tables: tabloKontrol,
        columns: kolonKontrol,
        foreignKeys: fkKontrol,
        indexes: indexKontrol,
        allChecksPassed,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Dynamic settings schema check hatasi:', error);
    return NextResponse.json({ error: 'Schema check basarisiz' }, { status: 500 });
  }
}
