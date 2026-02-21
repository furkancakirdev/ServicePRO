import { permanentRedirect } from 'next/navigation';

export default function CallDetayRedirectPage() {
  permanentRedirect('/talepler?source=telefon');
}
