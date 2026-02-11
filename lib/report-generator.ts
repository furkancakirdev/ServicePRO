import { Service, ServisDurumu } from '@/types';
import { getStatusConfig } from '@/lib/config/status-config';

interface WhatsAppRaporConfig {
  baslik: string;
  tarih: string;
  servisler: Service[];
  devamEdenler?: Service[];
}

function resolveDurumLabel(durum: ServisDurumu | string): string {
  const config = getStatusConfig(durum);
  return config?.label || 'Bilinmiyor';
}

// Detayli format ile rapor olustur
export function generateWhatsAppRapor(config: WhatsAppRaporConfig): string {
  const { baslik, tarih, servisler, devamEdenler } = config;

  let rapor = `📅 ${baslik} (${tarih})\n`;
  rapor += '─────────────────────────────────\n';

  if (servisler.length === 0) {
    rapor += 'Planli servis bulunmamaktadir.\n';
  } else {
    servisler.forEach((s) => {
      const saat = s.saat || '—';
      rapor += `${saat} | ${s.tekneAdi}\n`;
      rapor += `📍 ${s.adres}${s.yer ? ` - ${s.yer}` : ''}\n`;
      rapor += `🛠️ ${s.servisAciklamasi}\n`;
      if (s.irtibatKisi && s.telefon) {
        rapor += `📞 ${s.irtibatKisi}: ${s.telefon}\n`;
      } else if (s.telefon) {
        rapor += `📞 ${s.telefon}\n`;
      }
      rapor += '\n';
    });
  }

  if (devamEdenler && devamEdenler.length > 0) {
    rapor += '🔄 DEVAM EDEN ISLER\n';
    rapor += '─────────────────────────────────\n';

    devamEdenler.forEach((s) => {
      const durumLabel = resolveDurumLabel(s.durum);
      rapor += `• ${s.tekneAdi} - ${s.adres} (${durumLabel})\n`;
    });
  }

  return rapor;
}

export function generateYarinRaporu(
  yarinServisler: Service[],
  devamEdenler: Service[]
): string {
  const yarin = new Date();
  yarin.setDate(yarin.getDate() + 1);

  const tarihStr = yarin.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return generateWhatsAppRapor({
    baslik: 'YARIN PLANLI ISLER',
    tarih: tarihStr,
    servisler: yarinServisler,
    devamEdenler,
  });
}

export function generateHaftaRaporu(
  haftaServisler: Service[],
  devamEdenler: Service[]
): string {
  const bugun = new Date();
  const haftaSonu = new Date();
  haftaSonu.setDate(bugun.getDate() + 7);

  const baslangic = bugun.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  const bitis = haftaSonu.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

  return generateWhatsAppRapor({
    baslik: 'HAFTALIK PLAN',
    tarih: `${baslangic} - ${bitis}`,
    servisler: haftaServisler,
    devamEdenler,
  });
}

// Gelecek haftanin planini olustur
export function generateGelecekHaftaRaporu(
  gelecekHaftaServisler: Service[]
): string {
  const bugun = new Date();
  const haftaBasi = new Date();
  haftaBasi.setDate(bugun.getDate() + (8 - bugun.getDay())); // Gelecek pazartesi
  const haftaSonu = new Date(haftaBasi);
  haftaSonu.setDate(haftaBasi.getDate() + 4); // Cuma

  const baslangic = haftaBasi.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  const bitis = haftaSonu.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });

  return generateWhatsAppRapor({
    baslik: 'GELECEK HAFTA PLANI',
    tarih: `${baslangic} - ${bitis}`,
    servisler: gelecekHaftaServisler,
  });
}

// Devam eden isleri filtrele
export function getDevamEdenler(servisler: Service[]): Service[] {
  const devamDurumlari: ServisDurumu[] = [
    'PARCA_BEKLIYOR',
    'MUSTERI_ONAY_BEKLIYOR',
    'RAPOR_BEKLIYOR',
    'DEVAM_EDIYOR',
    'RANDEVU_VERILDI',
  ];

  return servisler.filter((s) => devamDurumlari.includes(s.durum));
}
