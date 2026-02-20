import Link from 'next/link';
import { Bell } from 'lucide-react';
import { AlertRulesTable } from '@/components/alerts/AlertRulesTable';
import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';

export default function AlertsSettingsPage() {
  return (
    <PageContent data-testid="alerts-settings-page">
      <PageHeader
        title="Alert Rules"
        description="Kural tabanli operasyon uyarilarini yonetin"
        breadcrumbs={[
          { label: 'Ayarlar', href: '/ayarlar' },
          { label: 'Alert Rules' },
        ]}
        rightActions={
          <Link href="/notifications" className="btn btn-secondary h-10 px-4 py-2">
            <Bell className="mr-2 h-4 w-4" />
            Notification Center
          </Link>
        }
      />

      <AlertRulesTable />
    </PageContent>
  );
}
