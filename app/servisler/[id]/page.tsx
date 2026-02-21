import { permanentRedirect } from 'next/navigation';

export default function ServisDetayRedirectPage({ params }: { params: { id: string } }) {
  permanentRedirect(`/is-emirleri/${params.id}`);
}
