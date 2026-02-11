import { DURUM_CONFIG as CENTRAL_DURUM_CONFIG } from '@/lib/config/status-config';

// ==================== SERVIS DURUMLARI ====================
export type ServisDurumu =
  | 'RANDEVU_VERILDI'
  | 'DEVAM_EDIYOR'
  | 'PARCA_BEKLIYOR'
  | 'MUSTERI_ONAY_BEKLIYOR'
  | 'RAPOR_BEKLIYOR'
  | 'KESIF_KONTROL'
  | 'TAMAMLANDI'
  | 'IPTAL'
  | 'ERTELENDI';

export const DURUM_CONFIG =
  CENTRAL_DURUM_CONFIG as unknown as Record<ServisDurumu, { label: string; color: string; bgColor: string; icon: string }>;

// ==================== KONUM GRUPLARI ====================
export type KonumGrubu = 'YATMARIN' | 'NETSEL' | 'DIS_SERVIS';

export const KONUM_CONFIG: Record<KonumGrubu, { label: string; color: string; icon: string }> = {
  YATMARIN: { label: 'Yatmarin (Merkez)', color: '#0f766e', icon: 'YM' },
  NETSEL: { label: 'Netsel', color: '#1d4ed8', icon: 'NT' },
  DIS_SERVIS: { label: 'Dış Servis', color: '#7c3aed', icon: 'DS' },
};

export function getKonumGrubu(adres: string): KonumGrubu {
  const upper = (adres || '').toUpperCase();
  if (upper.includes('YATMARİN') || upper.includes('YATMARIN')) return 'YATMARIN';
  if (upper.includes('NETSEL')) return 'NETSEL';
  return 'DIS_SERVIS';
}

// ==================== İŞ TİPLERİ ====================
export type IsTuru = 'PAKET' | 'ARIZA' | 'PROJE';

export const IS_TURU_CONFIG: Record<IsTuru, { label: string; carpan: number }> = {
  PAKET: { label: 'Paket İş (Rutin)', carpan: 1.0 },
  ARIZA: { label: 'Arıza / Keşif', carpan: 1.2 },
  PROJE: { label: 'Proje / Refit', carpan: 1.5 },
};

// ==================== PERSONEL ====================
export type PersonelUnvan = 'usta' | 'cirak' | 'yonetici' | 'ofis';

export interface Personnel {
  id: string;
  ad: string;
  rol: 'teknisyen' | 'yetkili';
  unvan: PersonelUnvan;
  aktif: boolean;
  girisYili?: number;
  aylikServisSayisi?: number;
  aylikOrtalamaPuan?: number;
  toplamRozetSayisi?: number;
  altinRozet?: number;
  gumusRozet?: number;
  bronzRozet?: number;
}

export const UNVAN_CONFIG: Record<PersonelUnvan, { label: string; icon: string }> = {
  usta: { label: 'Usta', icon: 'US' },
  cirak: { label: 'Çırak', icon: 'CR' },
  yonetici: { label: 'Yönetici', icon: 'YN' },
  ofis: { label: 'Ofis', icon: 'OF' },
};

// ==================== SERVİS ====================
export interface PersonelAtama {
  personnelId: string;
  personnelAd: string;
  rol: 'sorumlu' | 'destek';
  unvan?: PersonelUnvan;
  bonus?: boolean;
}

export interface ParcaBekleme {
  parcaAdi: string;
  miktar: number;
  tedarikci?: string;
  beklenenTarih?: string;
}

export interface Service {
  id: string;
  tarih: string;
  saat?: string;
  tekneAdi: string;
  adres: string; // Ana adres
  yer: string; // Lokasyon
  servisAciklamasi: string;
  irtibatKisi?: string;
  telefon?: string;
  isTuru: IsTuru;
  durum: ServisDurumu;
  atananPersonel: PersonelAtama[];
  ofisYetkilisi?: string;
  bekleyenParcalar?: ParcaBekleme[];
  taseronNotlari?: string;
  kapanisRaporu?: KapanisRaporu;
}

// ==================== KAPANIŞ RAPORU ====================
export interface KapanisRaporu {
  uniteBilgileri: boolean;
  fotograf: boolean;
  tekneKonum: boolean;
  sarfMalzeme: boolean;
  adamSaat: boolean;
  taseronBilgisi: boolean;
  stokMalzeme: boolean;
  saatiOlmayanUnitePuanDisi: boolean; // "Ünite saati yazılmış mı?" sorusuna HAYİR denirse tiklenebilir (puan dışı)
  adamSaatUygulanmazPuanDisi: boolean; // "Harcanan süre adam/saat belirtilmiş mi?" sorusuna dahil (puan dışı)
  aciklama: string;
  raporlayanPersonel: string;
  raporTarihi: string;
}

export const RAPOR_GEREKSINIMLERI: Record<IsTuru, (keyof Omit<KapanisRaporu, 'aciklama' | 'raporlayanPersonel' | 'raporTarihi'>)[]> = {
  PAKET: ['uniteBilgileri', 'fotograf', 'tekneKonum', 'sarfMalzeme', 'stokMalzeme'],
  ARIZA: ['uniteBilgileri', 'fotograf', 'tekneKonum', 'sarfMalzeme', 'adamSaat', 'stokMalzeme'],
  PROJE: ['uniteBilgileri', 'fotograf', 'tekneKonum', 'sarfMalzeme', 'adamSaat', 'taseronBilgisi', 'stokMalzeme'],
};

// ==================== PUANLAMA SİSTEMİ ====================
export type YetkiliYanit = 'EVET' | 'KISMEN' | 'HAYIR' | 'ATLA';

export const YANIT_PUANLARI: Record<YetkiliYanit, number | null> = {
  EVET: 100,
  KISMEN: 60,
  HAYIR: 0,
  ATLA: null,
};

// ==================== ROL BAZLI SORU SETLERİ ====================
export interface SoruConfig {
  key: string;
  label: string;
  aciklama: string;
}

export const USTA_SORULARI: SoruConfig[] = [
  {
    key: 'uniformaVeIsg',
    label: 'Üniforma ve İSG Uyumu',
    aciklama: 'Personel iş güvenliği ekipmanlarını (KKD) kullandı mı? Üniforma temiz ve düzenli miydi?',
  },
  {
    key: 'musteriIletisimi',
    label: 'Müşteri İletişim Kalitesi',
    aciklama: 'Müşterilerle profesyonel ve saygılı iletişim kurdu mu? Şikayet aldı mı?',
  },
  {
    key: 'planlamaKoordinasyon',
    label: 'Planlama ve Koordinasyon',
    aciklama: 'İş planına uydu mu? Değişiklikleri zamanında bildirdi mi?',
  },
  {
    key: 'teknikTespit',
    label: 'Teknik Tespit Yeteneği',
    aciklama: 'Arızaları ve ek iş ihtiyaçlarını doğru tespit edebildi mi?',
  },
  {
    key: 'raporDokumantasyon',
    label: 'Rapor ve Dokümantasyon',
    aciklama: 'İş raporlarını eksiksiz ve zamanında teslim etti mi?',
  },
  {
    key: 'genelLiderlik',
    label: 'Genel Liderlik',
    aciklama: 'Ekibini yönetti mi? Çıraklara rehberlik etti mi? Sorumluluk aldı mı?',
  },
];

export const CIRAK_SORULARI: SoruConfig[] = [
  {
    key: 'uniformaVeIsg',
    label: 'Üniforma ve İSG Uyumu',
    aciklama: 'Personel iş güvenliği ekipmanlarını (KKD) kullandı mı? Üniforma temiz ve düzenli miydi?',
  },
  {
    key: 'ekipIciDavranis',
    label: 'Ekip İçi Davranış',
    aciklama: 'Ekip arkadaşlarıyla uyumlu çalıştı mı? Çatışma veya tutum problemi var mıydı?',
  },
  {
    key: 'destekKalitesi',
    label: 'Ustalara Destek Kalitesi',
    aciklama: 'Ustalara verilen görevlerde yardımcı oldu mu? Talimatlara uydu mu?',
  },
  {
    key: 'ogrenmeGelisim',
    label: 'Öğrenme İsteği ve Gelişim',
    aciklama: 'Bu ay yeni bir şey öğrendi mi? Soru sordu mu? İlerleme kaydetti mi?',
  },
];

// ==================== İSMAİL ÇOBAN DEĞERLENDİRMESİ ====================
export interface IsmailDegerlendirmesi {
  id: string;
  personnelId: string;
  personnelAd: string;
  ay: string;
  puan: 1 | 2 | 3 | 4 | 5;
  kilitlendi: boolean;
  kayitTarihi: string;
}

export const ISMAIL_PUAN_ACIKLAMALARI: Record<1 | 2 | 3 | 4 | 5, { label: string; color: string }> = {
  1: { label: 'Çok Yetersiz', color: '#ef4444' },
  2: { label: 'Geliştirilmeli', color: '#f97316' },
  3: { label: 'Standart', color: '#eab308' },
  4: { label: 'İyi', color: '#22c55e' },
  5: { label: 'Mükemmel', color: '#10b981' },
};

// ==================== YETKİLİ DEĞERLENDİRMESİ ====================
export interface YetkiliDegerlendirmesiUsta {
  personnelId: string;
  personnelAd: string;
  ay: string;
  yetkiliId: string;
  sorular: {
    uniformaVeIsg: YetkiliYanit;
    musteriIletisimi: YetkiliYanit;
    planlamaKoordinasyon: YetkiliYanit;
    teknikTespit: YetkiliYanit;
    raporDokumantasyon: YetkiliYanit;
    genelLiderlik: YetkiliYanit;
  };
  toplamPuan: number;
}

export interface YetkiliDegerlendirmesiCirak {
  personnelId: string;
  personnelAd: string;
  ay: string;
  yetkiliId: string;
  sorular: {
    uniformaVeIsg: YetkiliYanit;
    ekipIciDavranis: YetkiliYanit;
    destekKalitesi: YetkiliYanit;
    ogrenmeGelisim: YetkiliYanit;
  };
  toplamPuan: number;
}

export interface ServisPuani {
  id: string;
  serviceId: string;
  personnelId: string;
  personnelAd: string;
  rol: 'sorumlu' | 'destek';
  isTuru: IsTuru;
  raporBasarisi: number;
  hamPuan: number;
  zorlukCarpani: number;
  finalPuan: number;
  bonus: boolean;
  tarih: string;
}

export interface AylikPerformans {
  personnelId: string;
  personnelAd: string;
  ay: string;
  servisSayisi: number;
  bireyselPuanOrtalama: number;
  yetkiliPuanOrtalama: number;
  ismailPuani: number;
  toplamPuan: number;
  siralama: number;
  rozetDurumu?: 'ALTIN' | 'GUMUS' | 'BRONZ';
}

export interface YillikKlasman {
  personnelId: string;
  personnelAd: string;
  altinRozet: number;
  gumusRozet: number;
  bronzRozet: number;
  toplamAylikPuan: number;
  siralama: number;
}

// ==================== DEĞERLENDİRME SORULARI ====================
export const DEGERLENDIRME_SORULARI = {
  USTA: USTA_SORULARI,
  CIRAK: CIRAK_SORULARI,
};

export const PERFORMANS_PUANLARI = {
  bireysel: 0.4,
  yetkili: 0.35,
  ismail: 0.25,
};

export const GENEL_PERFORMANS_SORULARI: SoruConfig[] = [
  {
    key: 'isKalitesi',
    label: 'İş Kalitesi',
    aciklama: 'Genel iş kalitesi ve detaylara dikkat',
  },
  {
    key: 'zamanlama',
    label: 'Zamanlama',
    aciklama: 'Planlanan sürede tamamlama',
  },
  {
    key: 'musteriMemnuniyeti',
    label: 'Müşteri Memnuniyeti',
    aciklama: 'Müşteri geri bildirimleri ve şikayetler',
  },
];

// ==================== KULLANICI ====================
export interface AuthUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'YETKILI' | 'TEKNISYEN' | 'MUSTERI';
  aktif: boolean;
  ad: string;
  createdAt?: Date;
  lastLoginAt?: Date;
}

// ==================== SABİTLER ====================
export const PUAN_AGIRLIKLARI = {
  bireysel: 0.4,
  yetkili: 0.35,
  ismail: 0.25,
};

export const YETKILI_LISTESI = ['Furkan Çakır', 'İsmail Çoban', 'Senem Kaptan', 'Diğer'];

export const TUM_PERSONEL: Personnel[] = [
  { id: '1', ad: 'Ali Can Yaylalı', rol: 'teknisyen', unvan: 'cirak', aktif: true },
  { id: '2', ad: 'Alican Yaylalı', rol: 'teknisyen', unvan: 'usta', aktif: true },
  { id: '3', ad: 'Batuhan Çoban', rol: 'teknisyen', unvan: 'cirak', aktif: true },
  { id: '4', ad: 'Cüneyt Yaylalı', rol: 'teknisyen', unvan: 'usta', aktif: true },
  { id: '5', ad: 'Emre Kaya', rol: 'teknisyen', unvan: 'cirak', aktif: true },
  { id: '6', ad: 'Erhan Turhan', rol: 'teknisyen', unvan: 'usta', aktif: true },
  { id: '7', ad: 'Halil İbrahim Duru', rol: 'teknisyen', unvan: 'cirak', aktif: true },
  { id: '8', ad: 'İbrahim Yayalık', rol: 'teknisyen', unvan: 'usta', aktif: true },
  { id: '9', ad: 'İbrahim Yaylalı', rol: 'teknisyen', unvan: 'cirak', aktif: true },
  { id: '10', ad: 'Mehmet Bacak', rol: 'teknisyen', unvan: 'cirak', aktif: false },
  { id: '11', ad: 'Mehmet Güven', rol: 'teknisyen', unvan: 'usta', aktif: true },
  { id: '12', ad: 'Melih Çoban', rol: 'teknisyen', unvan: 'cirak', aktif: true },
  { id: '13', ad: 'Sercan Sarız', rol: 'teknisyen', unvan: 'usta', aktif: true },
  { id: '14', ad: 'Volkan Özkan', rol: 'teknisyen', unvan: 'cirak', aktif: true },
  { id: '15', ad: 'Yusuf Kara', rol: 'teknisyen', unvan: 'cirak', aktif: true },
  { id: '16', ad: 'Ahmet Demir', rol: 'teknisyen', unvan: 'usta', aktif: true },
  { id: '17', ad: 'Mustafa Yıldız', rol: 'teknisyen', unvan: 'cirak', aktif: true },
];


