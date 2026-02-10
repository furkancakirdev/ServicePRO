interface StatCardProps {
    value: number | string;
    label: string;
    icon: string;
    variant?: 'default' | 'success' | 'warning' | 'info' | 'gold';
    suffix?: string;
    color?: string;
}

export default function StatCard({
    value,
    label,
    icon,
    variant = 'default',
    suffix = '',
    color,
}: StatCardProps) {
    return (
        <div className={`stat-card ${variant}`} style={color ? { borderLeftColor: color } : undefined}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-sm)',
            }}>
                <span style={{ fontSize: '1.5rem' }}>{icon}</span>
            </div>
            <div className="stat-value">
                {value}{suffix}
            </div>
            <div className="stat-label">{label}</div>
        </div>
    );
}
