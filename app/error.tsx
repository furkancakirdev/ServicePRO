'use client';

import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { PageErrorState } from '@/components/ui/page-states';

export default function RootError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <PageContent>
      <PageHeader title="Operasyon Paneli" description="Gunluk akis" />
      <PageErrorState
        title="Sayfa acilirken hata olustu"
        description={error.message || 'Lutfen tekrar deneyin.'}
        onRetry={reset}
      />
    </PageContent>
  );
}
