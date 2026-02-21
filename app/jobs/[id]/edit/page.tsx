import { permanentRedirect } from 'next/navigation';

export default function JobEditRedirectPage({
  params,
}: {
  params: { id: string };
}) {
  permanentRedirect(`/is-emirleri/${params.id}/edit`);
}
