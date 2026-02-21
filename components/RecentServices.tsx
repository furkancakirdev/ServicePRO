'use client';

import Link from 'next/link';
import { UserRound, UsersRound } from 'lucide-react';
import type { ServisDurumu as PrismaServisDurumu } from '@prisma/client';
import { StatusBadge } from './StatusBadge';
import type { Service } from '@/types';

const mockServices: Service[] = [
  {
    id: '1',
    tarih: '2026-01-14',
    saat: '09:30',
    tekneAdi: 'S/Y BELLA BLUE',
    adres: 'NETSEL',
    yer: 'L Pontonu',
    servisAciklamasi: 'YANMAR 4JH80 motor rutin bakimi',
    irtibatKisi: 'Ahmet Kaptan',
    telefon: '+905321234567',
    isTuru: 'PAKET',
    durum: 'DEVAM_EDIYOR',
    atananPersonel: [{ personnelId: '1', personnelAd: 'Mehmet Guven', rol: 'sorumlu' }],
  },
  {
    id: '2',
    tarih: '2026-01-14',
    saat: '11:00',
    tekneAdi: 'M/V ARIEL',
    adres: 'YATMARIN',
    yer: 'Adakoy',
    servisAciklamasi: 'Seakeeper ariza kontrolu',
    irtibatKisi: 'Nermin Hanim',
    telefon: '+905357276156',
    isTuru: 'ARIZA',
    durum: 'PARCA_BEKLIYOR',
    atananPersonel: [
      { personnelId: '2', personnelAd: 'Ibrahim Yaylalik', rol: 'sorumlu' },
      { personnelId: '3', personnelAd: 'Alican Yaylali', rol: 'destek' },
    ],
  },
  {
    id: '3',
    tarih: '2026-01-14',
    saat: '14:00',
    tekneAdi: 'CAT. HELIOS',
    adres: 'BOZBURUN',
    yer: 'DSV Marina',
    servisAciklamasi: 'Pasarella montaji ve genel kontrol',
    isTuru: 'PROJE',
    durum: 'RAPOR_BEKLIYOR',
    atananPersonel: [{ personnelId: '4', personnelAd: 'Sercan Sariz', rol: 'sorumlu' }],
  },
];

export default function RecentServices() {
  return (
    <section className="surface-panel p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-100">Bugunku servisler</h3>
        <Link href="/is-emirleri" className="text-xs font-semibold text-sky-300 hover:text-sky-200">
          Tumunu gor
        </Link>
      </div>

      <div className="space-y-2">
        {mockServices.map((service) => (
          <div
            key={service.id}
            className="rounded-lg border border-slate-700/70 bg-slate-900/45 px-3 py-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-100">
                  {service.saat || '--:--'} • {service.tekneAdi}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {service.adres} / {service.yer}
                </p>
                <p className="mt-1 line-clamp-1 text-xs text-slate-300">{service.servisAciklamasi}</p>
              </div>
              <StatusBadge status={service.durum as PrismaServisDurumu} />
            </div>

            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
              {service.atananPersonel.map((personel) => (
                <span key={personel.personnelId} className="inline-flex items-center gap-1">
                  {personel.rol === 'sorumlu' ? (
                    <UserRound className="h-3.5 w-3.5" />
                  ) : (
                    <UsersRound className="h-3.5 w-3.5" />
                  )}
                  {personel.personnelAd}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
