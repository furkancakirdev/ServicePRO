'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceForm } from '@/components/forms/service-form';

export default function YeniServisPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto max-w-4xl py-10">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-6 pl-0 hover:bg-transparent"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
      </Button>

      <ServiceForm mode="create" />
    </div>
  );
}
