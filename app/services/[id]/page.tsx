import { redirect } from 'next/navigation';

export default function ServiceDetailRedirectPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/is-emirleri/${params.id}`);
}
