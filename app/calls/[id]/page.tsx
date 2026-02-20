import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTimeForUi } from '@/lib/timezone';
import { prisma } from '@/lib/prisma';

export default async function CallBookingDetailPage({ params }: { params: { id: string } }) {
  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: {
      lead: {
        select: {
          id: true,
          status: true,
        },
      },
      servis: {
        select: {
          id: true,
          tekneAdi: true,
          durum: true,
        },
      },
    },
  });

  if (!booking) {
    notFound();
  }

  return (
    <PageContent>
      <PageHeader
        title="Booking Detay"
        description={`Booking #${booking.id.slice(-6).toUpperCase()}`}
        breadcrumbs={[
          { label: 'Operasyon', href: '/' },
          { label: 'Call Booking', href: '/calls' },
          { label: `Booking #${booking.id.slice(-6).toUpperCase()}` },
        ]}
        rightActions={
          <Link href="/calls" className="btn btn-secondary h-10 px-4 py-2">
            Listeye Don
          </Link>
        }
      />

      <Card className="surface-panel">
        <CardHeader>
          <CardTitle className="text-base">Booking Ozeti</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Durum: {booking.status}</p>
          <p>Arayan: {booking.arayanAd ?? '-'}</p>
          <p>Telefon: {booking.telefon ?? '-'}</p>
          <p>Tekne: {booking.tekneAd ?? '-'}</p>
          <p>Konu: {booking.konu ?? '-'}</p>
          <p>Tercih: {booking.tercihTarih ? formatDateTimeForUi(booking.tercihTarih) : '-'}</p>
          <p>Olusturma: {formatDateTimeForUi(booking.createdAt)}</p>
          {booking.servis ? (
            <p>
              Job: <Link className="underline" href={`/jobs/${booking.servis.id}`}>{booking.servis.tekneAdi}</Link>
            </p>
          ) : null}
          {booking.lead ? (
            <p>
              Lead: <Link className="underline" href={`/leads/${booking.lead.id}`}>{booking.lead.status}</Link>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </PageContent>
  );
}
