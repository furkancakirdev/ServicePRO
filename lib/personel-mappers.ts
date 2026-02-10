import { type PersonelUnvan } from '@prisma/client';

type ApiPersonelUnvan = 'usta' | 'cirak' | 'yonetici' | 'ofis';

export function mapUnvanToApi(unvan: PersonelUnvan): ApiPersonelUnvan {
  switch (unvan) {
    case 'USTA':
      return 'usta';
    case 'CIRAK':
      return 'cirak';
    case 'YONETICI':
      return 'yonetici';
    case 'OFIS':
      return 'ofis';
    default:
      return 'cirak';
  }
}

export function mapUnvanToDb(value: string | null | undefined): PersonelUnvan {
  const normalized = (value ?? '').toLowerCase().trim();
  switch (normalized) {
    case 'usta':
    case 'ustabasi':
      return 'USTA';
    case 'yonetici':
      return 'YONETICI';
    case 'ofis':
      return 'OFIS';
    case 'cirak':
    case 'teknisyen':
    default:
      return 'CIRAK';
  }
}

export function mapRolToDb(value: string | null | undefined): 'teknisyen' | 'yetkili' {
  return (value ?? '').toLowerCase().trim() === 'yetkili' ? 'yetkili' : 'teknisyen';
}

