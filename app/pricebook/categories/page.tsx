import { permanentRedirect } from 'next/navigation';

export default function PricebookCategoriesRedirectPage() {
  permanentRedirect('/ayarlar/devre-disi?modul=pricebook');
}
