import { redirect } from 'next/navigation';

type PersonelDuzenlePageProps = {
  params: {
    id: string;
  };
};

export default function PersonelDuzenlePage({ params }: PersonelDuzenlePageProps) {
  redirect(`/personel/${params.id}?duzenle=1`);
}
