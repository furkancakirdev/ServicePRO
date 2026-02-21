import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { TaleplerProTable } from '@/components/talepler/TaleplerProTable';

export default function TaleplerPage() {
  return (
    <PageContent className="max-w-none">
      <PageHeader
        title="Talepler"
        description="Talep kaydı oluşturun, filtreleyin ve iş emrine dönüştürün."
        breadcrumbs={[
          { label: 'Operasyon', href: '/operasyon' },
          { label: 'Talepler' },
        ]}
      />
      <div className="min-w-0 overflow-x-auto">
        <TaleplerProTable />
      </div>
    </PageContent>
  );
}
