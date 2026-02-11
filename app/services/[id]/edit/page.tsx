import { redirect } from 'next/navigation';

export default function ServiceEditRedirectPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/servisler/${params.id}/duzenle`);
}

