import { permanentRedirect } from 'next/navigation';

export default function LegacyAyarlarRedirectPage() {
  permanentRedirect('/ayarlar');
}
