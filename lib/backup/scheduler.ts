import { promises as fs } from 'fs';
import path from 'path';
import { yedekKlasoruYoluGetir, yedekOlustur, yedekleriListele } from '@/lib/backup';
import type { YedekListeElemani } from './types';

const VARSAYILAN_RETENTION_GUN = 30;
const VARSAYILAN_MINIMUM_YEDEK = 1;

export interface BackupTemizlikSonucu {
  retentionGun: number;
  silinenDosyalar: string[];
  silinenDosyaSayisi: number;
  kalanYedekSayisi: number;
}

export interface OtomatikBackupSonucu extends BackupTemizlikSonucu {
  olusturulanYedekId: string;
  olusturulanYedekDosyasi: string;
  tetiklenmeZamani: string;
}

function retentionGunSayisiGetir(overrideGun?: number): number {
  if (typeof overrideGun === 'number' && Number.isFinite(overrideGun)) {
    return Math.max(0, Math.floor(overrideGun));
  }

  const envDegeri = Number(process.env.BACKUP_RETENTION_DAYS);
  if (!Number.isFinite(envDegeri)) return VARSAYILAN_RETENTION_GUN;
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

export async function eskiYedekleriTemizle(secenekler?: {
  retentionGun?: number;
  minimumYedekSayisi?: number;
}): Promise<BackupTemizlikSonucu> {
  const retentionGun = retentionGunSayisiGetir(secenekler?.retentionGun);
  const minimumYedekSayisi = minimumYedekSayisiGetir(secenekler?.minimumYedekSayisi);
  const tumYedekler = yeniyeGoreSirala(await yedekleriListele(10000));

  const simdi = Date.now();
  const retentionEsik = simdi - retentionGun * 24 * 60 * 60 * 1000;
  const korunacakYedekler = new Set(
    tumYedekler.slice(0, minimumYedekSayisi).map((yedek) => yedek.dosyaAdi)
  );

  const silinecekYedekler = tumYedekler.filter((yedek) => {
    if (korunacakYedekler.has(yedek.dosyaAdi)) return false;
    return new Date(yedek.tarih).getTime() < retentionEsik;
  });

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
    retentionGun,
    silinenDosyalar,
    silinenDosyaSayisi: silinenDosyalar.length,
    kalanYedekSayisi,
  };
}

export async function otomatikYedekCalistir(secenekler?: {
  retentionGun?: number;
  minimumYedekSayisi?: number;
}): Promise<OtomatikBackupSonucu> {
  const olusturulanYedek = await yedekOlustur({ tur: 'otomatik' });
  const temizlikSonucu = await eskiYedekleriTemizle({
    retentionGun: secenekler?.retentionGun,
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
