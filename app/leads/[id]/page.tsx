import { permanentRedirect } from 'next/navigation';

export default function LeadDetayRedirectPage({ params }: { params: { id: string } }) {
  permanentRedirect(`/talepler/${params.id}`);
}
