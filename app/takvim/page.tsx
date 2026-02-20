import Link from 'next/link';
import { CalendarDays, Plus } from 'lucide-react';
import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { DispatchPlanningBoard } from '@/components/takvim/dispatch-planning-board';

export default function TakvimPage() {
  return (
    <PageContent data-testid="takvim-page">
      <PageHeader
        title="Takvim Planlama"
        description="Teknisyen bazli dispatch planlama"
        breadcrumbs={[
          { label: 'Operasyon', href: '/' },
          { label: 'Takvim' },
        ]}
        rightActions={
          <>
            <Link href="/servisler" className="btn btn-secondary h-10 px-4 py-2">
              <CalendarDays className="mr-2 h-4 w-4" />
              Listeye Don
            </Link>
            <Link href="/servisler/yeni" className="btn btn-primary h-10 px-4 py-2">
              <Plus className="mr-2 h-4 w-4" />
              Yeni Is Emri
            </Link>
          </>
        }
      />

      <DispatchPlanningBoard />
    </PageContent>
  );
}
