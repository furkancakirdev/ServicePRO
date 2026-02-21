import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, Descriptions, List, Typography } from 'antd';
import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';
import { formatDateTimeForUi } from '@/lib/timezone';
import { prisma } from '@/lib/prisma';

export default async function TalepDetayPage({ params }: { params: { id: string } }) {
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

  const shortId = lead.id.slice(-6).toLocaleUpperCase('tr-TR');

  return (
    <PageContent>
      <PageHeader
        title="Talep Detayı"
        description={`Talep #${shortId}`}
        breadcrumbs={[
          { label: 'Operasyon', href: '/operasyon' },
          { label: 'Talepler', href: '/talepler' },
          { label: `Talep #${shortId}` },
        ]}
        rightActions={
          <Link href="/talepler" className="btn btn-secondary h-10 px-4 py-2">
            Listeye Dön
          </Link>
        }
      />

      <Card title="Talep Özeti">
        <Descriptions
          size="small"
          column={1}
          items={[
            { key: 'durum', label: 'Durum', children: lead.status },
            { key: 'ad', label: 'Ad', children: lead.ad ?? '-' },
            { key: 'telefon', label: 'Telefon', children: lead.telefon ?? '-' },
            { key: 'eposta', label: 'E-posta', children: lead.email ?? '-' },
            { key: 'konu', label: 'Konu', children: lead.konu ?? '-' },
            {
              key: 'takip',
              label: 'Takip',
              children: lead.takipAt ? formatDateTimeForUi(lead.takipAt) : '-',
            },
            {
              key: 'olusturma',
              label: 'Oluşturma',
              children: formatDateTimeForUi(lead.createdAt),
            },
          ]}
        />

        <div className="pt-3">
          <Typography.Text className="text-xs uppercase tracking-wide" type="secondary">
            İlgili Kayıtlar
          </Typography.Text>
          {lead.bookings.length === 0 ? (
            <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0 }}>-</Typography.Paragraph>
          ) : (
            <List
              size="small"
              style={{ marginTop: 8 }}
              dataSource={lead.bookings}
              renderItem={(booking) => (
                <List.Item key={booking.id}>
                  <span>
                    {booking.id.slice(-6).toLocaleUpperCase('tr-TR')} - {booking.status}
                    {booking.servisId ? (
                      <span>
                        {' '}(
                        <Link className="underline" href={`/is-emirleri/${booking.servisId}`}>
                          İş Emri
                        </Link>
                        )
                      </span>
                    ) : null}
                  </span>
                </List.Item>
              )}
            />
          )}
        </div>
      </Card>
    </PageContent>
  );
}
