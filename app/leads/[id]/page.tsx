import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTimeForUi } from '@/lib/timezone';
import { prisma } from '@/lib/prisma';

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: {
      bookings: {
        select: {
          id: true,
          status: true,
          servisId: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  if (!lead) {
    notFound();
  }

  return (
    <PageContent>
      <PageHeader
        title="Lead Detay"
        description={`Lead #${lead.id.slice(-6).toUpperCase()}`}
        breadcrumbs={[
          { label: 'Operasyon', href: '/' },
          { label: 'Leads', href: '/leads' },
          { label: `Lead #${lead.id.slice(-6).toUpperCase()}` },
        ]}
        rightActions={
          <Link href="/leads" className="btn btn-secondary h-10 px-4 py-2">
            Listeye Don
          </Link>
        }
      />

      <Card className="surface-panel">
        <CardHeader>
          <CardTitle className="text-base">Lead Ozeti</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Durum: {lead.status}</p>
          <p>Ad: {lead.ad ?? '-'}</p>
          <p>Telefon: {lead.telefon ?? '-'}</p>
          <p>Email: {lead.email ?? '-'}</p>
          <p>Konu: {lead.konu ?? '-'}</p>
          <p>Takip: {lead.takipAt ? formatDateTimeForUi(lead.takipAt) : '-'}</p>
          <p>Olusturma: {formatDateTimeForUi(lead.createdAt)}</p>
          <div className="pt-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Ilgili Bookingler</p>
            {lead.bookings.length === 0 ? (
              <p>-</p>
            ) : (
              <ul className="space-y-1">
                {lead.bookings.map((booking) => (
                  <li key={booking.id}>
                    <Link className="underline" href={`/calls/${booking.id}`}>
                      {booking.id.slice(-6).toUpperCase()} - {booking.status}
                    </Link>
                    {booking.servisId ? (
                      <span>
                        {' '}
                        (<Link className="underline" href={`/jobs/${booking.servisId}`}>Job</Link>)
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </PageContent>
  );
}
