import { promises as fs } from 'fs';
import path from 'path';
import { konfigVerisiniDisaAktar } from './config-export';
import { veritabaniVerisiniDisaAktar } from './db-export';
import { sheetsVerisiniDisaAktar } from './sheets-export';
import {
  type YedekIcerigi,
  type YedekListeElemani,
  type YedekMetadata,
  type YedekTuru,
} from './types';

const YEDEK_SURUMU: YedekIcerigi['version'] = '1.0';
const YEDEK_DOSYA_ON_EKI = 'servicepro';

export function yedekKlasoruYoluGetir(): string {
  const ortamDegeri = process.env.BACKUP_DIR?.trim();
  if (ortamDegeri) {
    return path.resolve(ortamDegeri);
  }
  return path.join(process.cwd(), 'backups');
}

async function yedekKlasorunuHazirla(): Promise<string> {
  const klasor = yedekKlasoruYoluGetir();
  await fs.mkdir(klasor, { recursive: true });
  return klasor;
}

function ikiHane(deger: number): string {
  return deger.toString().padStart(2, '0');
}

function dosyaZamanEtiketiOlustur(tarih: Date): string {
  const yil = tarih.getUTCFullYear();
  const ay = ikiHane(tarih.getUTCMonth() + 1);
  const gun = ikiHane(tarih.getUTCDate());
  const saat = ikiHane(tarih.getUTCHours());
  const dakika = ikiHane(tarih.getUTCMinutes());
  const saniye = ikiHane(tarih.getUTCSeconds());
  return `${yil}${ay}${gun}-${saat}${dakika}${saniye}`;
}

function dosyaBoyutuFormatla(boyutBayt: number): string {
  if (boyutBayt < 1024) return `${boyutBayt} B`;
  if (boyutBayt < 1024 * 1024) return `${(boyutBayt / 1024).toFixed(1)} KB`;
  return `${(boyutBayt / (1024 * 1024)).toFixed(1)} MB`;
}

function dosyaAdindanIdUret(dosyaAdi: string): string {
  return dosyaAdi.replace(/\.json$/i, '');
}

function yedekListeElemaniOlustur(
  dosyaYolu: string,
  dosyaAdi: string,
  yedekIcerigi: YedekIcerigi,
  boyutBayt: number
): YedekListeElemani {
  return {
    id: dosyaAdindanIdUret(dosyaAdi),
    dosyaAdi,
    dosyaYolu,
    tarih: yedekIcerigi.timestamp,
    tur: yedekIcerigi.type,
    boyutBayt,
    boyut: dosyaBoyutuFormatla(boyutBayt),
    durum: 'tamamlandi',
    kayitSayisi: yedekIcerigi.metadata.recordCount,
    metadata: yedekIcerigi.metadata,
  };
}

export async function yedekOlustur(secenekler?: {
  tur?: YedekTuru;
}): Promise<YedekListeElemani> {
  const tur = secenekler?.tur ?? 'manuel';
  const yedekKlasoru = await yedekKlasorunuHazirla();
  const olusturmaZamani = new Date();
  const timestamp = olusturmaZamani.toISOString();
  const dosyaEtiketi = dosyaZamanEtiketiOlustur(olusturmaZamani);
  const dosyaAdi = `${YEDEK_DOSYA_ON_EKI}-${dosyaEtiketi}.json`;
  const dosyaYolu = path.join(yedekKlasoru, dosyaAdi);

  const [veritabani, sheets, konfig] = await Promise.all([
    veritabaniVerisiniDisaAktar(),
    sheetsVerisiniDisaAktar(),
    konfigVerisiniDisaAktar(),
  ]);

  const metadata: YedekMetadata = {
    recordCount: veritabani.toplamKayit,
    tables: veritabani.tablolar,
  };

  const yedekIcerigi: YedekIcerigi = {
    version: YEDEK_SURUMU,
    timestamp,
    type: tur,
    metadata,
    data: veritabani.veriler,
    sheets,
    config: konfig,
  };

  await fs.writeFile(dosyaYolu, JSON.stringify(yedekIcerigi, null, 2), 'utf8');
  const istatistik = await fs.stat(dosyaYolu);
  return yedekListeElemaniOlustur(dosyaYolu, dosyaAdi, yedekIcerigi, istatistik.size);
}

function yedekIcerigiMi(aday: unknown): aday is YedekIcerigi {
  if (typeof aday !== 'object' || aday === null) return false;
  if (
    !('version' in aday) ||
    !('timestamp' in aday) ||
    !('metadata' in aday) ||
    !('type' in aday)
  ) {
    return false;
  }
  const tip = (aday as { type?: unknown }).type;
  if (tip !== 'manuel' && tip !== 'otomatik') return false;

  const metadata = (aday as { metadata?: unknown }).metadata;
  if (typeof metadata !== 'object' || metadata === null) return false;
  if (!('recordCount' in metadata) || !('tables' in metadata)) return false;

  return true;
}

export async function yedekleriListele(limit = 50): Promise<YedekListeElemani[]> {
  const yedekKlasoru = await yedekKlasorunuHazirla();
  const dosyalar = await fs.readdir(yedekKlasoru, { withFileTypes: true });

  const yedekler: YedekListeElemani[] = [];

  for (const dosya of dosyalar) {
    if (!dosya.isFile() || !dosya.name.endsWith('.json')) continue;

    const dosyaYolu = path.join(yedekKlasoru, dosya.name);
    try {
      const icerikMetni = await fs.readFile(dosyaYolu, 'utf8');
      const hamIcerik = JSON.parse(icerikMetni) as unknown;
      if (!yedekIcerigiMi(hamIcerik)) continue;
      const istatistik = await fs.stat(dosyaYolu);
      yedekler.push(
        yedekListeElemaniOlustur(dosyaYolu, dosya.name, hamIcerik, istatistik.size)
      );
    } catch (hata) {
      console.error('Yedek dosyasi okunamadi:', dosyaYolu, hata);
    }
  }

  return yedekler
    .sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime())
    .slice(0, limit);
}

export async function yedekDosyasiOku(dosyaAdi: string): Promise<YedekIcerigi> {
  const yedekKlasoru = await yedekKlasorunuHazirla();
  const temizDosyaAdi = path.basename(dosyaAdi);
  const dosyaYolu = path.join(yedekKlasoru, temizDosyaAdi);
  const hamIcerik = await fs.readFile(dosyaYolu, 'utf8');
  const yedekIcerigi = JSON.parse(hamIcerik) as unknown;
  if (!yedekIcerigiMi(yedekIcerigi)) {
    throw new Error('Yedek dosya formati gecersiz');
  }
  return yedekIcerigi;
}
