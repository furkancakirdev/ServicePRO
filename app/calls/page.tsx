import { permanentRedirect } from 'next/navigation';

export default function CallsRedirectPage() {
  permanentRedirect('/talepler?source=telefon');
}
