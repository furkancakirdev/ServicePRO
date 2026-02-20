import { promises as fs } from 'fs';
import path from 'path';
import { yedekKlasoruYoluGetir, yedekOlustur, yedekleriListele } from '@/lib/backup';
import type { YedekListeElemani } from './types';

const VARSAYILAN_RETENTION_GUN = 30;
const VARSAYILAN_GUNLUK_YEDEK = 7;
const VARSAYILAN_HAFTALIK_YEDEK = 4;
const VARSAYILAN_MINIMUM_YEDEK = 1;

type RetentionModu = 'daily_weekly' | 'legacy_days';

export interface BackupRetentionPolitikasi {
  mod: RetentionModu;
  retentionGun: number | null;
  gunlukYedekSayisi: number;
  haftalikYedekSayisi: number;
  minimumYedekSayisi: number;
}

export interface BackupTemizlikSonucu {
  retentionGun: number;
  retentionPolitikasi: BackupRetentionPolitikasi;
  silinenDosyalar: string[];
  silinenDosyaSayisi: number;
  kalanYedekSayisi: number;
}

export interface OtomatikBackupSonucu extends BackupTemizlikSonucu {
  olusturulanYedekId: string;
  olusturulanYedekDosyasi: string;
  tetiklenmeZamani: string;
}

function retentionModuGetir(overrideMod?: RetentionModu): RetentionModu {
  if (overrideMod === 'daily_weekly' || overrideMod === 'legacy_days') {
    return overrideMod;
  }

  const envMod = process.env.BACKUP_RETENTION_MODE?.trim().toLowerCase();
  if (envMod === 'legacy_days') return 'legacy_days';
  if (envMod === 'daily_weekly') return 'daily_weekly';

  const envRetentionGun = Number(process.env.BACKUP_RETENTION_DAYS);
  if (Number.isFinite(envRetentionGun)) {
    return 'legacy_days';
  }

  return 'daily_weekly';
}

function retentionGunSayisiGetir(overrideGun?: number): number | undefined {
  if (typeof overrideGun === 'number' && Number.isFinite(overrideGun)) {
    return Math.max(0, Math.floor(overrideGun));
  }

  const envDegeri = Number(process.env.BACKUP_RETENTION_DAYS);
  if (!Number.isFinite(envDegeri)) return undefined;
  return Math.max(0, Math.floor(envDegeri));
}

function gunlukYedekSayisiGetir(overrideDeger?: number): number {
  if (typeof overrideDeger === 'number' && Number.isFinite(overrideDeger)) {
    return Math.max(1, Math.floor(overrideDeger));
  }

  const envDegeri = Number(process.env.BACKUP_RETENTION_DAILY);
  if (!Number.isFinite(envDegeri)) return VARSAYILAN_GUNLUK_YEDEK;
  return Math.max(1, Math.floor(envDegeri));
}

function haftalikYedekSayisiGetir(overrideDeger?: number): number {
  if (typeof overrideDeger === 'number' && Number.isFinite(overrideDeger)) {
    return Math.max(0, Math.floor(overrideDeger));
  }

  const envDegeri = Number(process.env.BACKUP_RETENTION_WEEKLY);
  if (!Number.isFinite(envDegeri)) return VARSAYILAN_HAFTALIK_YEDEK;
  return Math.max(0, Math.floor(envDegeri));
}

function minimumYedekSayisiGetir(overrideDeger?: number): number {
  if (typeof overrideDeger === 'number' && Number.isFinite(overrideDeger)) {
    return Math.max(1, Math.floor(overrideDeger));
  }
  return VARSAYILAN_MINIMUM_YEDEK;
}

function yeniyeGoreSirala(yedekler: YedekListeElemani[]): YedekListeElemani[] {
  return [...yedekler].sort(
    (a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime()
  );
}

function utcGunAnahtari(tarih: Date): string {
  return `${tarih.getUTCFullYear()}-${(tarih.getUTCMonth() + 1).toString().padStart(2, '0')}-${tarih
    .getUTCDate()
    .toString()
    .padStart(2, '0')}`;
}

function utcGunBaslangici(tarih: Date): number {
  return Date.UTC(tarih.getUTCFullYear(), tarih.getUTCMonth(), tarih.getUTCDate());
}

function gunFarkiHesapla(referansTarih: Date, adayTarih: Date): number {
  const msGun = 24 * 60 * 60 * 1000;
  return Math.floor((utcGunBaslangici(referansTarih) - utcGunBaslangici(adayTarih)) / msGun);
}

function isoHaftaAnahtari(tarih: Date): string {
  const gecici = new Date(Date.UTC(tarih.getUTCFullYear(), tarih.getUTCMonth(), tarih.getUTCDate()));
  const gun = gecici.getUTCDay() || 7;
  gecici.setUTCDate(gecici.getUTCDate() + 4 - gun);
  const yilBaslangici = new Date(Date.UTC(gecici.getUTCFullYear(), 0, 1));
  const haftaNo = Math.ceil((((gecici.getTime() - yilBaslangici.getTime()) / 86400000) + 1) / 7);
  return `${gecici.getUTCFullYear()}-W${haftaNo.toString().padStart(2, '0')}`;
}

function legacyRetentionKorumaSeti(
  tumYedekler: YedekListeElemani[],
  retentionGun: number,
  minimumYedekSayisi: number,
  referansZamani: Date
): Set<string> {
  const korunacak = new Set(
    tumYedekler.slice(0, minimumYedekSayisi).map((yedek) => yedek.dosyaAdi)
  );

  const retentionEsik = referansZamani.getTime() - retentionGun * 24 * 60 * 60 * 1000;
  for (const yedek of tumYedekler) {
    const yedekZamani = new Date(yedek.tarih).getTime();
    if (Number.isNaN(yedekZamani)) {
      korunacak.add(yedek.dosyaAdi);
      continue;
    }
    if (yedekZamani >= retentionEsik) {
      korunacak.add(yedek.dosyaAdi);
    }
  }

  return korunacak;
}

function gunlukHaftalikKorumaSeti(
  tumYedekler: YedekListeElemani[],
  gunlukYedekSayisi: number,
  haftalikYedekSayisi: number,
  minimumYedekSayisi: number,
  referansZamani: Date
): Set<string> {
  const korunacak = new Set(
    tumYedekler.slice(0, minimumYedekSayisi).map((yedek) => yedek.dosyaAdi)
  );
  const gunlukKorunanlar = new Set<string>();
  const haftalikKorunanlar = new Set<string>();

  for (const yedek of tumYedekler) {
    if (korunacak.has(yedek.dosyaAdi)) continue;

    const yedekTarihi = new Date(yedek.tarih);
    if (Number.isNaN(yedekTarihi.getTime())) {
      korunacak.add(yedek.dosyaAdi);
      continue;
    }

    const fark = gunFarkiHesapla(referansZamani, yedekTarihi);
    const gunAnahtari = utcGunAnahtari(yedekTarihi);

    if (fark < gunlukYedekSayisi) {
      if (!gunlukKorunanlar.has(gunAnahtari)) {
        gunlukKorunanlar.add(gunAnahtari);
        korunacak.add(yedek.dosyaAdi);
      }
      continue;
    }

    const haftaAnahtari = isoHaftaAnahtari(yedekTarihi);
    if (!haftalikKorunanlar.has(haftaAnahtari) && haftalikKorunanlar.size < haftalikYedekSayisi) {
      haftalikKorunanlar.add(haftaAnahtari);
      korunacak.add(yedek.dosyaAdi);
    }
  }

  if (korunacak.size < minimumYedekSayisi) {
    for (const yedek of tumYedekler) {
      korunacak.add(yedek.dosyaAdi);
      if (korunacak.size >= minimumYedekSayisi) break;
    }
  }

  return korunacak;
}

export async function eskiYedekleriTemizle(secenekler?: {
  retentionModu?: RetentionModu;
  retentionGun?: number;
  gunlukYedekSayisi?: number;
  haftalikYedekSayisi?: number;
  minimumYedekSayisi?: number;
}): Promise<BackupTemizlikSonucu> {
  const retentionModu =
    typeof secenekler?.retentionGun === 'number'
      ? 'legacy_days'
      : retentionModuGetir(secenekler?.retentionModu);
  const retentionGunFromConfig = retentionGunSayisiGetir(secenekler?.retentionGun);
  const retentionGun =
    retentionModu === 'legacy_days'
      ? retentionGunFromConfig ?? VARSAYILAN_RETENTION_GUN
      : null;
  const gunlukYedekSayisi = gunlukYedekSayisiGetir(secenekler?.gunlukYedekSayisi);
  const haftalikYedekSayisi = haftalikYedekSayisiGetir(secenekler?.haftalikYedekSayisi);
  const minimumYedekSayisi = minimumYedekSayisiGetir(secenekler?.minimumYedekSayisi);
  const tumYedekler = yeniyeGoreSirala(await yedekleriListele(10000));
  const referansZamani = new Date();

  const korunacakYedekler =
    retentionModu === 'legacy_days'
      ? legacyRetentionKorumaSeti(tumYedekler, retentionGun ?? VARSAYILAN_RETENTION_GUN, minimumYedekSayisi, referansZamani)
      : gunlukHaftalikKorumaSeti(
          tumYedekler,
          gunlukYedekSayisi,
          haftalikYedekSayisi,
          minimumYedekSayisi,
          referansZamani
        );

  const silinecekYedekler = tumYedekler.filter((yedek) => !korunacakYedekler.has(yedek.dosyaAdi));

  const yedekKlasoru = yedekKlasoruYoluGetir();
  const silinenDosyalar: string[] = [];

  for (const yedek of silinecekYedekler) {
    const dosyaYolu = path.join(yedekKlasoru, yedek.dosyaAdi);
    try {
      await fs.unlink(dosyaYolu);
      silinenDosyalar.push(yedek.dosyaAdi);
    } catch (hata) {
      console.error('Eski yedek dosyasi silinemedi:', dosyaYolu, hata);
    }
  }

  const kalanYedekSayisi = (await yedekleriListele(10000)).length;

  return {
    retentionGun: retentionGun ?? gunlukYedekSayisi,
    retentionPolitikasi: {
      mod: retentionModu,
      retentionGun,
      gunlukYedekSayisi,
      haftalikYedekSayisi,
      minimumYedekSayisi,
    },
    silinenDosyalar,
    silinenDosyaSayisi: silinenDosyalar.length,
    kalanYedekSayisi,
  };
}

export async function otomatikYedekCalistir(secenekler?: {
  retentionModu?: RetentionModu;
  retentionGun?: number;
  gunlukYedekSayisi?: number;
  haftalikYedekSayisi?: number;
  minimumYedekSayisi?: number;
}): Promise<OtomatikBackupSonucu> {
  const olusturulanYedek = await yedekOlustur({ tur: 'otomatik' });
  const temizlikSonucu = await eskiYedekleriTemizle({
    retentionModu: secenekler?.retentionModu,
    retentionGun: secenekler?.retentionGun,
    gunlukYedekSayisi: secenekler?.gunlukYedekSayisi,
    haftalikYedekSayisi: secenekler?.haftalikYedekSayisi,
    minimumYedekSayisi: secenekler?.minimumYedekSayisi,
  });

  return {
    olusturulanYedekId: olusturulanYedek.id,
    olusturulanYedekDosyasi: olusturulanYedek.dosyaAdi,
    tetiklenmeZamani: new Date().toISOString(),
    ...temizlikSonucu,
  };
}

export function sonrakiGunlukCalismaZamani(
  referansZamani: Date = new Date()
): string {
  const sonraki = new Date(referansZamani);
  sonraki.setUTCDate(sonraki.getUTCDate() + 1);
  sonraki.setUTCHours(0, 0, 0, 0);
  return sonraki.toISOString();
}
