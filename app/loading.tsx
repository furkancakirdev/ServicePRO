import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { PageLoadingState } from '@/components/ui/page-states';

export default function RootLoading() {
  return (
    <PageContent>
      <PageHeader title="Operasyon Paneli" description="Gunluk akis" />
      <PageLoadingState label="Sayfa yukleniyor..." />
    </PageContent>
  );
}
