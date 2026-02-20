import Link from 'next/link';
import { BookOpenText, Layers, LayoutTemplate } from 'lucide-react';
import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';

const cards = [
  {
    href: '/pricebook/items',
    title: 'Pricebook Kalemleri',
    description: 'Hizmet, malzeme ve paket kalemlerini kod/fiyat ile yonetin.',
    icon: BookOpenText,
  },
  {
    href: '/pricebook/categories',
    title: 'Pricebook Kategorileri',
    description: 'Kalemleri hiyerarsik kategorilerde gruplayin.',
    icon: Layers,
  },
  {
    href: '/templates/jobs',
    title: 'Job Templates',
    description: 'Sik kullanilan line item setlerini tek tikla uygulayin.',
    icon: LayoutTemplate,
  },
];

export default function PricebookPage() {
  return (
    <PageContent data-testid="pricebook-page">
      <PageHeader
        title="Pricebook Lite"
        description="Standart kalem, kategori ve template yonetimi"
        breadcrumbs={[
          { label: 'Operasyon', href: '/' },
          { label: 'Pricebook' },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="surface-panel flex h-full flex-col gap-3 p-4 transition hover:border-primary/50"
            >
              <div className="flex items-center gap-2 text-foreground">
                <Icon className="h-5 w-5" />
                <h3 className="text-sm font-semibold">{card.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{card.description}</p>
            </Link>
          );
        })}
      </section>
    </PageContent>
  );
}
