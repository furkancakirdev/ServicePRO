'use client';

import Link from 'next/link';
import { CalendarPlus2, MessageCircleMore, Star } from 'lucide-react';

const actions = [
  {
    href: '/servisler/yeni',
    label: 'Yeni servis',
    helper: 'Hizli kayit',
    Icon: CalendarPlus2,
  },
  {
    href: '/raporlar/whatsapp',
    label: 'WhatsApp',
    helper: 'Metin olustur',
    Icon: MessageCircleMore,
  },
  {
    href: '/deger',
    label: 'Degerlendirme',
    helper: 'Puanlari gir',
    Icon: Star,
  },
];

export default function QuickActions() {
  return (
    <section className="surface-panel quick-actions-panel p-6" data-testid="quick-actions-panel">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-100">Hizli islemler</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex min-h-[44px] items-center gap-3 rounded-lg border border-slate-700/70 bg-slate-900/55 px-3 py-3 text-slate-100 transition hover:border-sky-500/60 hover:bg-slate-900"
            data-testid={`quick-action-${action.href.replaceAll('/', '-').replaceAll('?', '-')}`}
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-sky-500/15 text-sky-300">
              <action.Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{action.label}</span>
              <span className="block text-xs text-slate-400">{action.helper}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
