import { permanentRedirect } from 'next/navigation';

export default function PricebookItemsRedirectPage() {
  permanentRedirect('/ayarlar/devre-disi?modul=pricebook');
}
