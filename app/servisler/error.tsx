'use client';

import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { PageErrorState } from '@/components/ui/page-states';

export default function ServislerError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <PageContent>
      <PageHeader title="Is Emirleri" description="Arama ve filtreleme" />
      <PageErrorState
        title="Is emirleri acilirken hata olustu"
        description={error.message || 'Lutfen tekrar deneyin.'}
        onRetry={reset}
      />
    </PageContent>
  );
}
