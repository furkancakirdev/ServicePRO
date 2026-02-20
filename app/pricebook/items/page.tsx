import Link from 'next/link';
import { Layers3 } from 'lucide-react';
import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { PricebookItemsTable } from '@/components/pricebook/PricebookItemsTable';

export default function PricebookItemsPage() {
  return (
    <PageContent data-testid="pricebook-items-page">
      <PageHeader
        title="Pricebook Kalemleri"
        description="Search-first kalem yonetimi ve soft-delete/pasif akis"
        breadcrumbs={[
          { label: 'Operasyon', href: '/' },
          { label: 'Pricebook', href: '/pricebook' },
          { label: 'Kalemler' },
        ]}
        rightActions={
          <Link href="/pricebook/categories" className="btn btn-secondary h-10 px-4 py-2">
            <Layers3 className="mr-2 h-4 w-4" />
            Kategoriler
          </Link>
        }
      />

      <PricebookItemsTable />
    </PageContent>
  );
}
