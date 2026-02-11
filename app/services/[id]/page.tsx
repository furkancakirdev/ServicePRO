import { redirect } from 'next/navigation';

export default function ServiceDetailRedirectPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/services/${params.id}/edit`);
}
