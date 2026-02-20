'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { ServiceForm } from '@/components/forms/service-form';

export default function YeniServisPage() {
  const router = useRouter();

  return (
    <PageContent className="max-w-5xl">
      <PageHeader
        title="Yeni Is Emri"
        description="Planlama ve atama bilgilerini kaydedin"
        breadcrumbs={[
          { label: 'Operasyon', href: '/' },
          { label: 'Is Emirleri', href: '/servisler' },
          { label: 'Yeni Is Emri' },
        ]}
        rightActions={
          <Button variant="outline" onClick={() => router.back()} className="h-10">
            <ArrowLeft className="mr-2 h-4 w-4" /> Geri Don
          </Button>
        }
      />

      <ServiceForm mode="create" />
    </PageContent>
  );
}
