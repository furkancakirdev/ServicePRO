import Link from 'next/link';
import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { IsEmirleriProTable } from '@/components/is-emirleri/IsEmirleriProTable';

export default function IsEmirleriPage() {
  return (
    <PageContent className="max-w-none">
      <PageHeader
        title="İş Emirleri"
        description="Durum, öncelik ve lokasyon filtreleriyle iş emri listesini yönetin."
        breadcrumbs={[
          { label: 'Operasyon', href: '/operasyon' },
          { label: 'İş Emirleri' },
        ]}
        rightActions={
          <Link href="/is-emirleri/yeni" className="btn btn-primary h-10 px-4 py-2">
            Yeni İş Emri
          </Link>
        }
      />
      <div className="min-w-0 overflow-x-auto">
        <IsEmirleriProTable />
      </div>
    </PageContent>
  );
}
