'use client';

import { useState } from 'react';
import { CalendarDays, FileText, Plus } from 'lucide-react';
import { Button } from 'antd';
import Link from 'next/link';
import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { DispatchPlanningBoard } from '@/components/takvim/dispatch-planning-board';
import { ReportSidebar } from '@/components/takvim/ReportSidebar';

export default function TakvimPage() {
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <>
      <ReportSidebar
        open={reportOpen}
        onClose={() => setReportOpen(false)}
      />
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
              <Button
                type="default"
                icon={<FileText className="h-4 w-4 mr-2" />}
                onClick={() => setReportOpen(true)}
                className="mr-2"
              >
                Rapor
              </Button>
              <Link href="/is-emirleri" className="btn btn-secondary h-10 px-4 py-2">
                <CalendarDays className="mr-2 h-4 w-4" />
                Listeye Dön
              </Link>
              <Link href="/is-emirleri/yeni" className="btn btn-primary h-10 px-4 py-2 ml-2">
                <Plus className="mr-2 h-4 w-4" />
                Yeni İş Emri
              </Link>
            </>
          }
        />

        <DispatchPlanningBoard />
      </PageContent>
    </>
  );
}
