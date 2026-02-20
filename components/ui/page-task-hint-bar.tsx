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
      title: 'Bugunun onceliklerini kontrol et ve acik isleri hizli kapat.',
      description: 'Ustteki ozet kartlarindan kritik durumu kontrol et, sonra listeye inip gorevi tamamla.',
    },
    action: { id: 'home-services', label: 'Servis listesine git', href: '/servisler' },
  },
  {
    match: (pathname) => pathname.startsWith('/servisler'),
    hint: {
      id: 'services',
      title: 'Filtrele, isi bul ve tek ekrandan durumu guncelle.',
      description: 'Arama ve faceted filtreler tek blokta. Aktif filtre etiketlerini kontrol ederek hata yapmayin.',
    },
    action: { id: 'services-new', label: 'Yeni servis kaydi', href: '/servisler/yeni' },
  },
  {
    match: (pathname) => pathname.startsWith('/ayarlar'),
    hint: {
      id: 'settings',
      title: 'Once sistem sagligini kontrol et, sonra gerekli ayari degistir.',
      description: 'Sync islemlerini sadece ihtiyac oldugunda calistirin; dogrulama sonuclarini loglarda kontrol edin.',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/personel'),
    hint: {
      id: 'personnel',
      title: 'Dogru personeli bul, atamayi ve unvani netlestir.',
      description: 'Filtreyi secin, personel kartina girin ve servis sorumluluklarini kontrol edin.',
    },
    action: { id: 'personnel-root', label: 'Tum personeli gor', href: '/personel' },
  },
  {
    match: (pathname) => pathname.startsWith('/profile'),
    hint: {
      id: 'profile',
      title: 'Hesap bilgilerini kontrol et, gerekirse sifreni hemen degistir.',
      description: 'Sifre degisikliginde yeni sifrenin en az 8 karakter oldugundan emin olun.',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/puanlama'),
    hint: {
      id: 'scoring',
      title: 'Ayi sec, siralamayi incele ve eksik puanlama varsa tamamla.',
      description: 'Aylik tabloda servis ve toplam puan kolonlarini birlikte okuyarak karar verin.',
    },
  },
  {
    match: (pathname) => pathname.startsWith('/raporlar'),
    hint: {
      id: 'reports',
      title: 'Ilk bakista trendi gor, sonra gerekli raporu disari aktar.',
      description: 'Filtreleri degistirdikten sonra tablo ve rozet ozetini ayni ekranda karsilastirin.',
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
          Ipuclarini tekrar goster
        </Button>
      </div>
    );
  }

  return <PageInlineHint hint={config.hint} action={config.action} className="mb-4" />;
}
