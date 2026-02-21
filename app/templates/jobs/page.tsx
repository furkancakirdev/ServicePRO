import { permanentRedirect } from 'next/navigation';

export default function TemplatesRedirectPage() {
  permanentRedirect('/ayarlar/devre-disi?modul=sablon');
}
