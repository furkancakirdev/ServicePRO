'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { ServiceForm } from '@/components/forms/service-form';

export default function EditServisPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  return (
    <PageContent className="max-w-5xl">
      <PageHeader
        title="Is Emri Duzenle"
        description="Kayit bilgilerini guncelleyin"
        breadcrumbs={[
          { label: 'Operasyon', href: '/' },
          { label: 'Is Emirleri', href: '/servisler' },
          { label: 'Duzenle' },
        ]}
        rightActions={
          <Button variant="outline" onClick={() => router.back()} className="h-10">
            <ArrowLeft className="mr-2 h-4 w-4" /> Geri Don
          </Button>
        }
      />

      <ServiceForm mode="edit" serviceId={params.id} />
    </PageContent>
  );
}
