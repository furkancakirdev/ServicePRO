import { permanentRedirect } from 'next/navigation';

export default function PricebookRedirectPage() {
  permanentRedirect('/ayarlar/devre-disi?modul=pricebook');
}
