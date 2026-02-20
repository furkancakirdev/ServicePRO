import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { PageLoadingState } from '@/components/ui/page-states';

export default function ServislerLoading() {
  return (
    <PageContent>
      <PageHeader title="Is Emirleri" description="Arama ve filtreleme" />
      <PageLoadingState label="Is emirleri yukleniyor..." />
    </PageContent>
  );
}
