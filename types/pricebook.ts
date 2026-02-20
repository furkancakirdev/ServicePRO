export const PRICEBOOK_ITEM_TYPE_VALUES = ['HIZMET', 'MALZEME', 'PAKET'] as const;
export type PricebookItemTypeValue = (typeof PRICEBOOK_ITEM_TYPE_VALUES)[number];

export const PRICEBOOK_ITEM_TYPE_LABELS: Record<PricebookItemTypeValue, string> = {
  HIZMET: 'Hizmet',
  MALZEME: 'Malzeme',
  PAKET: 'Paket',
};

export type PricebookCategoryRecord = {
  id: string;
  ad: string;
  parentId: string | null;
  parentName: string | null;
  sira: number;
  aktif: boolean;
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type PricebookItemRecord = {
  id: string;
  tip: PricebookItemTypeValue;
  kod: string | null;
  ad: string;
  aciklama: string | null;
  birim: string | null;
  varsayilanSureSaat: number | null;
  varsayilanFiyat: number | null;
  maliyet: number | null;
  categoryId: string | null;
  categoryName: string | null;
  aktif: boolean;
  createdAt: string;
  updatedAt: string;
};

export type JobLineItemRecord = {
  id: string;
  servisId: string;
  pricebookItemId: string | null;
  ad: string;
  miktar: number;
  birimFiyat: number;
  toplam: number;
  notlar: string | null;
  createdAt: string;
  updatedAt: string;
  pricebookItem?: {
    id: string;
    tip: PricebookItemTypeValue;
    kod: string | null;
    birim: string | null;
  } | null;
};

export type JobTemplateItemRecord = {
  id: string;
  templateId: string;
  pricebookItemId: string | null;
  ad: string;
  miktar: number;
  birimFiyat: number;
  sira: number;
  pricebookItem?: {
    id: string;
    tip: PricebookItemTypeValue;
    kod: string | null;
    birim: string | null;
  } | null;
};

export type JobTemplateRecord = {
  id: string;
  ad: string;
  aciklama: string | null;
  aktif: boolean;
  defaultStatus: string | null;
  defaultNotlar: string | null;
  itemCount: number;
  estimatedTotal: number;
  createdAt: string;
  updatedAt: string;
  items: JobTemplateItemRecord[];
};
