import Link from 'next/link';
import { PackageSearch } from 'lucide-react';
import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { PricebookCategoriesTable } from '@/components/pricebook/PricebookCategoriesTable';

export default function PricebookCategoriesPage() {
  return (
    <PageContent data-testid="pricebook-categories-page">
      <PageHeader
        title="Pricebook Kategorileri"
        description="Kategori hiyerarsisi, sira ve aktif/pasif yonetimi"
        breadcrumbs={[
          { label: 'Operasyon', href: '/' },
          { label: 'Pricebook', href: '/pricebook' },
          { label: 'Kategoriler' },
        ]}
        rightActions={
          <Link href="/pricebook/items" className="btn btn-secondary h-10 px-4 py-2">
            <PackageSearch className="mr-2 h-4 w-4" />
            Kalemler
          </Link>
        }
      />

      <PricebookCategoriesTable />
    </PageContent>
  );
}
