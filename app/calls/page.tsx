import Link from 'next/link';
import { PhoneCall } from 'lucide-react';
import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { CallsBoard } from '@/components/calls/CallsBoard';

export default function CallsPage() {
  return (
    <PageContent data-testid="calls-page">
      <PageHeader
        title="Call Booking"
        description="Gelen talepleri booking olarak kaydet ve job/lead'e donustur"
        breadcrumbs={[
          { label: 'Operasyon', href: '/' },
          { label: 'Call Booking' },
        ]}
        rightActions={
          <Link href="/leads" className="btn btn-secondary h-10 px-4 py-2">
            <PhoneCall className="mr-2 h-4 w-4" />
            Lead Pipeline
          </Link>
        }
      />

      <CallsBoard />
    </PageContent>
  );
}
