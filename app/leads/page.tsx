import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { LeadsBoard } from '@/components/leads/LeadsBoard';

export default function LeadsPage() {
  return (
    <PageContent data-testid="leads-page">
      <PageHeader
        title="Lead Pipeline"
        description="Takip, durum guncelleme ve lead'den job olusturma"
        breadcrumbs={[
          { label: 'Operasyon', href: '/' },
          { label: 'Leads' },
        ]}
        rightActions={
          <Link href="/calls" className="btn btn-secondary h-10 px-4 py-2">
            <ClipboardList className="mr-2 h-4 w-4" />
            Call Booking
          </Link>
        }
      />

      <LeadsBoard />
    </PageContent>
  );
}
