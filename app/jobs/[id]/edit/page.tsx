import { redirect } from 'next/navigation';

export default function JobEditRedirectPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/servisler/${params.id}/duzenle`);
}
