import { permanentRedirect } from 'next/navigation';

export default function ServisDuzenleRedirectPage({ params }: { params: { id: string } }) {
  permanentRedirect(`/is-emirleri/${params.id}/edit`);
}
