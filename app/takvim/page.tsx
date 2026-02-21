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
        description="Gün ve hafta görünümünde yalnızca tarih planlaması"
        breadcrumbs={[
          { label: 'Operasyon', href: '/operasyon' },
          { label: 'Takvim' },
        ]}
        rightActions={
          <>
            <Link href="/is-emirleri" className="btn btn-secondary h-10 px-4 py-2">
              <CalendarDays className="mr-2 h-4 w-4" />
              Listeye Dön
            </Link>
            <Link href="/is-emirleri/yeni" className="btn btn-primary h-10 px-4 py-2">
              <Plus className="mr-2 h-4 w-4" />
              Yeni İş Emri
            </Link>
          </>
        }
      />

      <DispatchPlanningBoard />
    </PageContent>
  );
}
