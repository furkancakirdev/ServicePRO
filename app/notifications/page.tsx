import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

export default function NotificationsPage() {
  return (
    <PageContent data-testid="notifications-page">
      <PageHeader
        title="Bildirim Merkezi"
        description="Uygulama içi bildirimleri görüntüle, okundu yap ve arşivle"
        breadcrumbs={[
          { label: 'Operasyon', href: '/operasyon' },
          { label: 'Bildirimler' },
        ]}
      />

      <NotificationCenter />
    </PageContent>
  );
}
