'use client';

import Link from 'next/link';
import { StatusBadge } from './StatusBadge';
import type { ServisDurumu as PrismaServisDurumu } from '@prisma/client';
import { Service } from '@/types';

// Mock data - will be replaced with API call
const mockServices: Service[] = [
    {
        id: '1',
        tarih: '2026-01-14',
        saat: '09:30',
        tekneAdi: 'S/Y BELLA BLUE',
        adres: 'NETSEL',
        yer: 'L Pontonu',
        servisAciklamasi: 'YANMAR 4JH80 Motor Rutin BakÄ±m',
        irtibatKisi: 'Ahmet Kaptan',
        telefon: '+905321234567',
        isTuru: 'PAKET',
        durum: 'DEVAM_EDIYOR',
        atananPersonel: [{ personnelId: '1', personnelAd: 'Mehmet GÃ¼ven', rol: 'sorumlu' }],
    },
    {
        id: '2',
        tarih: '2026-01-14',
        saat: '11:00',
        tekneAdi: 'M/V ARIEL',
        adres: 'YATMARÄ°N',
        yer: 'AdakÃ¶y',
        servisAciklamasi: 'Seakeeper ArÄ±za Kontrol',
        irtibatKisi: 'Nermin HanÄ±m',
        telefon: '+905357276156',
        isTuru: 'ARIZA',
        durum: 'PARCA_BEKLIYOR',
        atananPersonel: [
            { personnelId: '2', personnelAd: 'Ä°brahim YayalÄ±k', rol: 'sorumlu' },
            { personnelId: '3', personnelAd: 'Alican YaylalÄ±', rol: 'destek' },
        ],
    },
    {
        id: '3',
        tarih: '2026-01-14',
        saat: '14:00',
        tekneAdi: 'CAT. HELIOS',
        adres: 'BOZBURUN',
        yer: 'DSV Marina',
        servisAciklamasi: 'Pasarella MontajÄ± + Genel Kontrol',
        isTuru: 'PROJE',
        durum: 'RAPOR_BEKLIYOR',
        atananPersonel: [{ personnelId: '4', personnelAd: 'Sercan SarÄ±z', rol: 'sorumlu' }],
    },
];

export default function RecentServices() {
    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">BugÃ¼nkÃ¼ Servisler</h3>
                <Link href="/servisler" className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                    TÃ¼mÃ¼nÃ¼ GÃ¶r â†’
                </Link>
            </div>

            <div className="table-container" style={{ boxShadow: 'none' }}>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Saat</th>
                            <th>Tekne</th>
                            <th>Ä°ÅŸ</th>
                            <th>Durum</th>
                            <th>Personel</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mockServices.map(service => (
                            <tr key={service.id}>
                                <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                                    {service.saat || 'â€”'}
                                </td>
                                <td>
                                    <div style={{ fontWeight: 500 }}>{service.tekneAdi}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                        {service.adres} - {service.yer}
                                    </div>
                                </td>
                                <td style={{ maxWidth: '250px' }}>
                                    <div style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {service.servisAciklamasi}
                                    </div>
                                </td>
                                <td>
                                    <StatusBadge status={service.durum as unknown as PrismaServisDurumu} />
                                </td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        {service.atananPersonel.map((p, i) => (
                                            <span
                                                key={i}
                                                style={{
                                                    fontSize: '0.85rem',
                                                    color: p.rol === 'sorumlu' ? 'var(--color-text)' : 'var(--color-text-muted)',
                                                }}
                                            >
                                                {p.rol === 'sorumlu' ? 'ğŸ‘¤' : 'ğŸ‘¥'} {p.personnelAd}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}


