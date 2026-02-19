import { redirect } from 'next/navigation';

export default function ServisDetayRedirect({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/servisler/${params.id}/duzenle`);
}
