interface StatCardProps {
    value: number | string;
    label: string;
    icon: string;
    variant?: 'default' | 'success' | 'warning' | 'info' | 'gold';
    suffix?: string;
    color?: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
}

/**
 * Grand Maritime StatCard Component
 *
 * Key metrics card with:
 * - Navy/gold color scheme
 * - Optional trend indicator
 * - Subtle gold accent border
 */
export default function StatCard({
    value,
    label,
    icon,
    variant = 'default',
    suffix = '',
    trend,
}: StatCardProps) {
    // Variant color mappings for Grand Maritime theme
    const variantStyles = {
        default: {
            bg: 'bg-gradient-to-br from-navy-700 to-navy-900',
            text: 'text-white',
            border: 'border-l-gold-500',
        },
        success: {
            bg: 'bg-gradient-to-br from-seafoam-500 to-seafoam-700',
            text: 'text-white',
            border: 'border-l-gold-500',
        },
        warning: {
            bg: 'bg-gradient-to-br from-sunset-500 to-sunset-700',
            text: 'text-white',
            border: 'border-l-gold-500',
        },
        info: {
            bg: 'bg-gradient-to-br from-skyblue-500 to-skyblue-700',
            text: 'text-white',
            border: 'border-l-gold-500',
        },
        gold: {
            bg: 'bg-gradient-to-br from-gold-500 to-gold-600',
            text: 'text-white',
            border: 'border-l-navy-900',
        },
    };

    const style = variantStyles[variant];

    return (
        <div className="group relative overflow-hidden rounded-lg border border-cream-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
            {/* Gold accent border */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.border} transition-all duration-200 group-hover:w-1.5`} />

            <div className="flex items-center gap-4">
                {/* Icon container with gradient */}
                <div className={`flex h-14 w-14 items-center justify-center rounded-lg ${style.bg} shadow-sm`}>
                    <span className={`text-2xl ${style.text}`} aria-hidden>
                        {icon}
                    </span>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col">
                    <div className="flex items-baseline gap-2">
                        <span className="font-display text-2xl font-bold text-navy-900">
                            {value}
                            {suffix}
                        </span>
                        {trend && (
                            <span className={`text-sm font-medium ${trend.isPositive ? 'text-seafoam-600' : 'text-coral-500'}`}>
                                {trend.isPositive ? '+' : ''}{trend.value}%
                            </span>
                        )}
                    </div>
                    <span className="text-sm text-slate-500">{label}</span>
                </div>
            </div>

            {/* Subtle hover effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-gold-500/0 via-gold-500/5 to-gold-500/0 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        </div>
    );
}
