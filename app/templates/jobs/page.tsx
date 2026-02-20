import Link from 'next/link';
import { BookOpenText } from 'lucide-react';
import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { JobTemplatesTable } from '@/components/templates/JobTemplatesTable';

export default function JobTemplatesPage() {
  return (
    <PageContent data-testid="job-templates-page">
      <PageHeader
        title="Job Templates"
        description="Template builder ile kalem setlerini yonet"
        breadcrumbs={[
          { label: 'Operasyon', href: '/' },
          { label: 'Templates' },
        ]}
        rightActions={
          <Link href="/pricebook/items" className="btn btn-secondary h-10 px-4 py-2">
            <BookOpenText className="mr-2 h-4 w-4" />
            Pricebook Kalemleri
          </Link>
        }
      />

      <JobTemplatesTable />
    </PageContent>
  );
}
