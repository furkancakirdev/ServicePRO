import { permanentRedirect } from 'next/navigation';

export default function JobDetayRedirectPage({ params }: { params: { id: string } }) {
  permanentRedirect(`/is-emirleri/${params.id}`);
}
