'use client';

import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { PageActionModel, UiHintConfig } from '@/types/ui';
import { PageInlineHint } from '@/components/ui/page-inline-hint';
import { useUiRedesign } from '@/components/ui/ui-redesign-provider';

interface RouteHintConfig {
  match: (pathname: string) => boolean;
  hint: UiHintConfig;
  action?: PageActionModel;
}

const ROUTE_HINTS: RouteHintConfig[] = [
  {
    match: (pathname) => pathname === '/',
    hint: {
      id: 'home',
      title: 'Bugünün önceliklerini kontrol et ve açık işleri hızlı kapat.',
      description: 'Üstteki özet kartlarından kritik durumu kontrol et, sonra listeye inip görevi tamamla.',
    },
    action: { id: 'home-services', label: 'İş emirlerine git', href: '/is-emirleri' },
  },
  {
    match: (pathname) => pathname.startsWith('/is-emirleri') || pathname.startsWith('/is-emirleri'),
    hint: {
      id: 'services',
      title: 'Filtrele, işi bul ve tek ekrandan durumu güncelle.',
      description: 'Arama ve filtreler tek blokta. Aktif filtre etiketlerini kontrol ederek hata yapmayın.',
    },
    action: { id: 'services-new', label: 'Yeni iş emri', href: '/is-emirleri/yeni' },
  },
  {
    match: (pathname) => pathname.startsWith('/ayarlar'),
    hint: {
      id: 'settings',
      title: 'Önce sistem sağlığını kontrol et, sonra gerekli ayarı değiştir.',
      description: 'Eşitleme işlemlerini sadece ihtiyaç olduğunda çalıştır; doğrulama sonuçlarını kayıtlardan kontrol et.',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/personel'),
    hint: {
      id: 'personnel',
      title: 'Doğru personeli bul, atamayı ve unvanı netleştir.',
      description: 'Filtreyi seç, personel kartına gir ve servis sorumluluklarını kontrol et.',
    },
    action: { id: 'personnel-root', label: 'Tüm personeli gör', href: '/personel' },
  },
  {
    match: (pathname) => pathname.startsWith('/profile'),
    hint: {
      id: 'profile',
      title: 'Hesap bilgilerini kontrol et, gerekirse şifreni hemen değiştir.',
      description: 'Şifre değişikliğinde yeni şifrenin en az 8 karakter olduğundan emin ol.',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/puanlama'),
    hint: {
      id: 'scoring',
      title: 'Ayı seç, sıralamayı incele ve eksik puanlama varsa tamamla.',
      description: 'Aylık tabloda servis ve toplam puan sütunlarını birlikte okuyarak karar ver.',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/raporlar'),
    hint: {
      id: 'reports',
      title: 'İlk bakışta trendi gör, sonra gerekli raporu dışa aktar.',
      description: 'Filtreleri değiştirdikten sonra tablo ve rozet özetini aynı ekranda karşılaştır.',
    },
  },
];

export function PageTaskHintBar() {
  const pathname = usePathname();
  const { enabled, hintsVisible, setHintsVisible } = useUiRedesign();

  if (!enabled) return null;

  const config = ROUTE_HINTS.find((routeHint) => routeHint.match(pathname));
  if (!config) return null;

  if (!hintsVisible) {
    return (
      <div className="mb-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setHintsVisible(true)}>
          İpuçlarını tekrar göster
        </Button>
      </div>
    );
  }

  return <PageInlineHint hint={config.hint} action={config.action} className="mb-4" />;
}
