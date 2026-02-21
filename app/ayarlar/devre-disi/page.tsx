import Link from 'next/link';
import { PageContent } from '@/components/layout/page-content';
import { PageHeader } from '@/components/layout/page-header';

const MODUL_ETIKETLERI: Record<string, string> = {
  pricebook: 'Fiyat Kataloğu',
  sablon: 'Şablonlar',
};

export default function DevreDisiModulPage({
  searchParams,
}: {
  searchParams?: { modul?: string };
}) {
  const modul = (searchParams?.modul || '').trim().toLocaleLowerCase('tr-TR');
  const modulEtiketi = MODUL_ETIKETLERI[modul] || 'Bu modül';

  return (
    <PageContent className="max-w-4xl">
      <PageHeader
        title="Modül Devre Dışı"
        description="Bu ekran Office-first UI vNext kapsamında kullanıcı arayüzünden kaldırıldı."
        breadcrumbs={[
          { label: 'Operasyon', href: '/operasyon' },
          { label: 'Ayarlar', href: '/ayarlar' },
          { label: 'Devre Dışı Modül' },
        ]}
      />

      <section className="card p-6">
        <h2 className="mb-2 text-lg font-semibold">{modulEtiketi} artık kullanıcıya açık değil.</h2>
        <p className="text-sm text-muted-foreground">
          Veritabanı kayıtları korunur, ancak ilgili rota ve menü akıştan kaldırılmıştır.
        </p>
        <div className="mt-4">
          <Link href="/ayarlar" className="btn btn-secondary h-10 px-4 py-2">
            Ayarlara Dön
          </Link>
        </div>
      </section>
    </PageContent>
  );
}
