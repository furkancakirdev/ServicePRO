import { redirect } from 'next/navigation';

export default function ServiceDetailRedirectPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/servisler/${params.id}`);
}
