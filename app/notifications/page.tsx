import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

export default function NotificationsPage() {
  return (
    <PageContent data-testid="notifications-page">
      <PageHeader
        title="Notification Center"
        description="In-app bildirimleri goruntule, okundu yap ve arsivle"
        breadcrumbs={[
          { label: 'Operasyon', href: '/' },
          { label: 'Notifications' },
        ]}
      />

      <NotificationCenter />
    </PageContent>
  );
}
