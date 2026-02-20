import { cn } from '@/lib/utils';

/**
 * Grand Maritime Performance Badge Component
 *
 * Displays achievement badges with:
 * - Gold/Silver/Bronze styling
 * - Icon support
 * - Glow effect for premium feel
 */

export interface BadgeType {
    id: string;
    name: string;
    description: string;
    icon: string;
    tier: 'gold' | 'silver' | 'bronze' | 'special';
    earnedAt?: Date;
}

interface PerformanceBadgeProps {
    badge: BadgeType;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    className?: string;
}

const tierStyles = {
    gold: {
        bg: 'bg-gradient-to-br from-gold-400 to-gold-600',
        border: 'border-gold-300',
        shadow: 'shadow-gold-500/50',
        glow: 'shadow-[0_0_20px_rgba(212,175,55,0.4)]',
    },
    silver: {
        bg: 'bg-gradient-to-br from-gray-300 to-gray-500',
        border: 'border-gray-200',
        shadow: 'shadow-gray-400/50',
        glow: 'shadow-[0_0_20px_rgba(192,192,192,0.3)]',
    },
    bronze: {
        bg: 'bg-gradient-to-br from-copper-400 to-copper-600',
        border: 'border-copper-300',
        shadow: 'shadow-copper-500/50',
        glow: 'shadow-[0_0_20px_rgba(184,115,51,0.3)]',
    },
    special: {
        bg: 'bg-gradient-to-br from-navy-600 to-navy-800',
        border: 'border-gold-500',
        shadow: 'shadow-navy-700/50',
        glow: 'shadow-[0_0_20px_rgba(10,35,66,0.4)]',
    },
};

const sizeStyles = {
    sm: { icon: 'text-2xl', container: 'w-12 h-12', label: 'text-xs' },
    md: { icon: 'text-3xl', container: 'w-16 h-16', label: 'text-sm' },
    lg: { icon: 'text-5xl', container: 'w-24 h-24', label: 'text-base' },
};

export function PerformanceBadge({
    badge,
    size = 'md',
    showLabel = true,
    className,
}: PerformanceBadgeProps) {
    const tier = tierStyles[badge.tier];
    const sizeStyle = sizeStyles[size];

    return (
        <div className={cn('flex flex-col items-center gap-2', className)}>
            <div
                className={cn(
                    'relative flex items-center justify-center rounded-full border-2',
                    tier.bg,
                    tier.border,
                    tier.shadow,
                    tier.glow,
                    sizeStyle.container,
                    'transition-all duration-300 hover:scale-110'
                )}
                title={badge.description}
            >
                <span className={tier.glow === '' ? '' : 'drop-shadow-md'}>
                    {badge.icon}
                </span>

                {/* Shine effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 via-transparent to-transparent" />
            </div>

            {showLabel && (
                <span className={cn('font-medium text-navy-900', sizeStyle.label)}>
                    {badge.name}
                </span>
            )}
        </div>
    );
}

/**
 * Monthly Ranking Badge Component
 * Displays Altın/Gümüş/Bronz for top 3 performers
 */
interface RankingBadgeProps {
    rank: 1 | 2 | 3;
    personnelName: string;
    score: number;
    size?: 'sm' | 'md' | 'lg';
}

const rankingBadges = {
    1: {
        icon: '🥇',
        tier: 'gold' as const,
        label: 'Altın Rozet',
        description: 'Ayın 1. sırası',
    },
    2: {
        icon: '🥈',
        tier: 'silver' as const,
        label: 'Gümüş Rozet',
        description: 'Ayın 2. sırası',
    },
    3: {
        icon: '🥉',
        tier: 'bronze' as const,
        label: 'Bronz Rozet',
        description: 'Ayın 3. sırası',
    },
};

export function RankingBadge({ rank, personnelName, score, size = 'md' }: RankingBadgeProps) {
    const badge = rankingBadges[rank];

    return (
        <div className="flex items-center gap-4 rounded-lg border border-cream-200 bg-white p-4 shadow-sm">
            <PerformanceBadge
                badge={{
                    id: `ranking-${rank}`,
                    name: badge.label,
                    description: badge.description,
                    icon: badge.icon,
                    tier: badge.tier,
                }}
                size={size}
                showLabel={false}
            />
            <div className="flex flex-col">
                <span className="font-display text-lg font-semibold text-navy-900">
                    {personnelName}
                </span>
                <span className="text-sm text-slate-500">{score} puan</span>
            </div>
        </div>
    );
}

/**
 * Achievement Badge Grid Component
 * Displays all achievement badges for a personnel
 */
interface AchievementBadgeGridProps {
    badges: BadgeType[];
    className?: string;
}

export function AchievementBadgeGrid({ badges, className }: AchievementBadgeGridProps) {
    const categories = {
        speed: { title: 'Hız Performansı', badges: [] as BadgeType[] },
        quality: { title: 'Kalite Performansı', badges: [] as BadgeType[] },
        special: { title: 'Özel Başarı', badges: [] as BadgeType[] },
    };

    badges.forEach(badge => {
        if (badge.id.startsWith('speed-')) {
            categories.speed.badges.push(badge);
        } else if (badge.id.startsWith('quality-')) {
            categories.quality.badges.push(badge);
        } else {
            categories.special.badges.push(badge);
        }
    });

    return (
        <div className={cn('space-y-6', className)}>
            {Object.entries(categories).map(([key, { title, badges: categoryBadges }]) => (
                <div key={key} className="space-y-3">
                    <h4 className="font-display text-sm font-semibold text-navy-900 uppercase tracking-wider">
                        {title}
                    </h4>
                    <div className="flex flex-wrap gap-4">
                        {categoryBadges.length > 0 ? (
                            categoryBadges.map(badge => (
                                <PerformanceBadge
                                    key={badge.id}
                                    badge={badge}
                                    size="md"
                                    showLabel
                                />
                            ))
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <span>🔒</span>
                                <span>Henüz kazanılmadı</span>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
