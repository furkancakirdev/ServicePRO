import { Prisma, type PricebookItemType } from '@prisma/client';
import type {
  JobLineItemRecord,
  JobTemplateItemRecord,
  JobTemplateRecord,
  PricebookCategoryRecord,
  PricebookItemRecord,
  PricebookItemTypeValue,
} from '@/types/pricebook';

export function toNullableText(value: unknown): string | null {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

export function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseRequiredDecimal(value: unknown, fieldName: string): Prisma.Decimal {
  if (value === null || value === undefined || value === '') {
    throw new Error(`${fieldName} zorunludur`);
  }

  const asNumber = Number(value);
  if (!Number.isFinite(asNumber)) {
    throw new Error(`${fieldName} sayisal olmalidir`);
  }

  return new Prisma.Decimal(asNumber);
}

export function parseOptionalDecimal(value: unknown, fieldName: string): Prisma.Decimal | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const asNumber = Number(value);
  if (!Number.isFinite(asNumber)) {
    throw new Error(`${fieldName} sayisal olmalidir`);
  }

  return new Prisma.Decimal(asNumber);
}

export function parsePositiveQuantity(value: unknown): Prisma.Decimal {
  const quantity = parseRequiredDecimal(value, 'Miktar');
  if (quantity.lte(0)) {
    throw new Error('Miktar sifirdan buyuk olmalidir');
  }
  return quantity;
}

export function calculateLineTotal(miktar: Prisma.Decimal, birimFiyat: Prisma.Decimal): Prisma.Decimal {
  const total = miktar.mul(birimFiyat);
  return new Prisma.Decimal(total.toFixed(2));
}

export function normalizeItemType(value: unknown): PricebookItemTypeValue {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'MALZEME' || normalized === 'PAKET') {
    return normalized;
  }
  return 'HIZMET';
}

export function mapPricebookCategoryDto(input: {
  id: string;
  ad: string;
  parentId: string | null;
  sira: number;
  aktif: boolean;
  createdAt: Date;
  updatedAt: Date;
  parent?: {
    ad: string;
  } | null;
  _count?: {
    items: number;
  };
}): PricebookCategoryRecord {
  return {
    id: input.id,
    ad: input.ad,
    parentId: input.parentId,
    parentName: input.parent?.ad ?? null,
    sira: input.sira,
    aktif: input.aktif,
    itemCount: input._count?.items,
    createdAt: input.createdAt.toISOString(),
    updatedAt: input.updatedAt.toISOString(),
  };
}

export function mapPricebookItemDto(input: {
  id: string;
  tip: PricebookItemType;
  kod: string | null;
  ad: string;
  aciklama: string | null;
  birim: string | null;
  varsayilanSureSaat: Prisma.Decimal | null;
  varsayilanFiyat: Prisma.Decimal | null;
  maliyet: Prisma.Decimal | null;
  categoryId: string | null;
  aktif: boolean;
  createdAt: Date;
  updatedAt: Date;
  category?: {
    ad: string;
  } | null;
}): PricebookItemRecord {
  return {
    id: input.id,
    tip: input.tip as PricebookItemTypeValue,
    kod: input.kod,
    ad: input.ad,
    aciklama: input.aciklama,
    birim: input.birim,
    varsayilanSureSaat: decimalToNumber(input.varsayilanSureSaat),
    varsayilanFiyat: decimalToNumber(input.varsayilanFiyat),
    maliyet: decimalToNumber(input.maliyet),
    categoryId: input.categoryId,
    categoryName: input.category?.ad ?? null,
    aktif: input.aktif,
    createdAt: input.createdAt.toISOString(),
    updatedAt: input.updatedAt.toISOString(),
  };
}

export function mapJobLineItemDto(input: {
  id: string;
  servisId: string;
  pricebookItemId: string | null;
  ad: string;
  miktar: Prisma.Decimal;
  birimFiyat: Prisma.Decimal;
  toplam: Prisma.Decimal;
  notlar: string | null;
  createdAt: Date;
  updatedAt: Date;
  pricebookItem?: {
    id: string;
    tip: PricebookItemType;
    kod: string | null;
    birim: string | null;
  } | null;
}): JobLineItemRecord {
  return {
    id: input.id,
    servisId: input.servisId,
    pricebookItemId: input.pricebookItemId,
    ad: input.ad,
    miktar: decimalToNumber(input.miktar) ?? 0,
    birimFiyat: decimalToNumber(input.birimFiyat) ?? 0,
    toplam: decimalToNumber(input.toplam) ?? 0,
    notlar: input.notlar,
    createdAt: input.createdAt.toISOString(),
    updatedAt: input.updatedAt.toISOString(),
    pricebookItem: input.pricebookItem
      ? {
          id: input.pricebookItem.id,
          tip: input.pricebookItem.tip as PricebookItemTypeValue,
          kod: input.pricebookItem.kod,
          birim: input.pricebookItem.birim,
        }
      : null,
  };
}

export function mapJobTemplateItemDto(input: {
  id: string;
  templateId: string;
  pricebookItemId: string | null;
  ad: string;
  miktar: Prisma.Decimal;
  birimFiyat: Prisma.Decimal;
  sira: number;
  pricebookItem?: {
    id: string;
    tip: PricebookItemType;
    kod: string | null;
    birim: string | null;
  } | null;
}): JobTemplateItemRecord {
  return {
    id: input.id,
    templateId: input.templateId,
    pricebookItemId: input.pricebookItemId,
    ad: input.ad,
    miktar: decimalToNumber(input.miktar) ?? 0,
    birimFiyat: decimalToNumber(input.birimFiyat) ?? 0,
    sira: input.sira,
    pricebookItem: input.pricebookItem
      ? {
          id: input.pricebookItem.id,
          tip: input.pricebookItem.tip as PricebookItemTypeValue,
          kod: input.pricebookItem.kod,
          birim: input.pricebookItem.birim,
        }
      : null,
  };
}

export function mapJobTemplateDto(input: {
  id: string;
  ad: string;
  aciklama: string | null;
  aktif: boolean;
  defaultStatus: string | null;
  defaultNotlar: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    templateId: string;
    pricebookItemId: string | null;
    ad: string;
    miktar: Prisma.Decimal;
    birimFiyat: Prisma.Decimal;
    sira: number;
    pricebookItem?: {
      id: string;
      tip: PricebookItemType;
      kod: string | null;
      birim: string | null;
    } | null;
  }>;
}): JobTemplateRecord {
  const items = input.items
    .map(mapJobTemplateItemDto)
    .sort((left, right) => left.sira - right.sira);

  const estimatedTotal = items.reduce((sum, item) => sum + item.miktar * item.birimFiyat, 0);

  return {
    id: input.id,
    ad: input.ad,
    aciklama: input.aciklama,
    aktif: input.aktif,
    defaultStatus: input.defaultStatus,
    defaultNotlar: input.defaultNotlar,
    itemCount: items.length,
    estimatedTotal,
    createdAt: input.createdAt.toISOString(),
    updatedAt: input.updatedAt.toISOString(),
    items,
  };
}
