'use client';

import { ServisDurumu, DURUM_CONFIG } from '@/types';

interface StatusBadgeProps {
    durum: ServisDurumu;
    showIcon?: boolean;
}

export default function StatusBadge({ durum, showIcon = true }: StatusBadgeProps) {
    const config = DURUM_CONFIG[durum];

    return (
        <span
            className="badge"
            style={{
                backgroundColor: config.bgColor,
                color: config.color,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
            }}
        >
            {showIcon && <span>{config.icon}</span>}
            <span>{config.label}</span>
        </span>
    );
}
