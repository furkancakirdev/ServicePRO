import { redirect } from 'next/navigation';

export default function ServiceEditRedirectPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/is-emirleri/${params.id}/edit`);
}
