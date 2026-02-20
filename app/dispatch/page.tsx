import Link from 'next/link';
import { CalendarDays, Plus } from 'lucide-react';
import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { DispatchBoard } from '@/components/dispatch/DispatchBoard';

export default function DispatchPage() {
  return (
    <PageContent data-testid="dispatch-page">
      <PageHeader
        title="Dispatch Board"
        description="Appointment tabanli teknisyen planlama"
        breadcrumbs={[
          { label: 'Operasyon', href: '/' },
          { label: 'Dispatch' },
        ]}
        rightActions={
          <>
            <Link href="/jobs" className="btn btn-secondary h-10 px-4 py-2">
              <CalendarDays className="mr-2 h-4 w-4" />
              Job Listesi
            </Link>
            <Link href="/jobs/yeni" className="btn btn-primary h-10 px-4 py-2">
              <Plus className="mr-2 h-4 w-4" />
              Yeni Job
            </Link>
          </>
        }
      />

      <DispatchBoard />
    </PageContent>
  );
}
