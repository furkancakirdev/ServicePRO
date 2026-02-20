import { cn } from '@/lib/utils';

/**
 * Grand Maritime Leaderboard Component
 *
 * Weekly/Monthly performance leaderboard with:
 * - Gold/Silver/Bronze highlighting for top 3
 * - Classic maritime design
 * - Trend indicators
 */

export interface LeaderboardEntry {
    rank: number;
    personnelId: string;
    personnelName: string;
    score: number;
    serviceCount: number;
    trend?: 'up' | 'down' | 'same';
    avatar?: string;
}

interface LeaderboardProps {
    entries: LeaderboardEntry[];
    title?: string;
    period?: string;
    className?: string;
}

const rankStyles = {
    1: {
        bg: 'bg-gradient-to-r from-gold-50 to-cream-100',
        border: 'border-gold-300',
        icon: '🥇',
        iconBg: 'bg-gold-100',
    },
    2: {
        bg: 'bg-gradient-to-r from-gray-50 to-cream-100',
        border: 'border-gray-300',
        icon: '🥈',
        iconBg: 'bg-gray-100',
    },
    3: {
        bg: 'bg-gradient-to-r from-copper-50 to-cream-100',
        border: 'border-copper-300',
        icon: '🥉',
        iconBg: 'bg-copper-100',
    },
};

const trendIcons = {
    up: <span className="text-seafoam-600">▲</span>,
    down: <span className="text-coral-500">▼</span>,
    same: <span className="text-slate-400">─</span>,
};

export function Leaderboard({
    entries,
    title = 'Haftalık Performans',
    period = 'Bu Hafta',
    className,
}: LeaderboardProps) {
    return (
        <div className={cn('rounded-lg border border-cream-200 bg-white shadow-sm', className)}>
            {/* Header */}
            <div className="border-b border-cream-200 bg-gradient-to-r from-navy-700 to-navy-900 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-display text-lg font-semibold text-white">
                            {title}
                        </h3>
                        <p className="text-sm text-navy-200">{period}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-gold-400">⚓</span>
                    </div>
                </div>
            </div>

            {/* Entries */}
            <div className="divide-y divide-cream-200">
                {entries.map((entry) => {
                    const isTopThree = entry.rank <= 3;
                    const style = isTopThree ? rankStyles[entry.rank as 1 | 2 | 3] : null;

                    return (
                        <div
                            key={entry.personnelId}
                            className={cn(
                                'flex items-center gap-4 px-6 py-4 transition-all duration-200 hover:bg-cream-50',
                                style?.bg
                            )}
                        >
                            {/* Rank */}
                            <div
                                className={cn(
                                    'flex h-10 w-10 items-center justify-center rounded-lg font-bold',
                                    style?.iconBg || 'bg-cream-100',
                                    isTopThree ? 'text-lg' : 'text-sm text-slate-600'
                                )}
                            >
                                {isTopThree ? style?.icon : `#${entry.rank}`}
                            </div>

                            {/* Avatar */}
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-navy-600 to-navy-800 text-white font-semibold">
                                {entry.avatar || (
                                    <span>
                                        {entry.personnelName
                                            .split(' ')
                                            .map(n => n[0])
                                            .join('')
                                            .toUpperCase()
                                            .slice(0, 2)}
                                    </span>
                                )}
                            </div>

                            {/* Name & Stats */}
                            <div className="flex-1">
                                <h4 className="font-display font-semibold text-navy-900">
                                    {entry.personnelName}
                                </h4>
                                <p className="text-sm text-slate-500">
                                    {entry.serviceCount} servis
                                </p>
                            </div>

                            {/* Score & Trend */}
                            <div className="flex items-center gap-4">
                                {entry.trend && (
                                    <div className="text-sm">
                                        {trendIcons[entry.trend]}
                                    </div>
                                )}
                                <div className="text-right">
                                    <div className="font-display text-xl font-bold text-navy-900">
                                        {entry.score}
                                    </div>
                                    <div className="text-xs text-slate-500">puan</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * Compact Leaderboard Row for dashboard
 */
interface LeaderboardRowProps {
    entry: LeaderboardEntry;
    className?: string;
}

export function LeaderboardRow({ entry, className }: LeaderboardRowProps) {
    const isTopThree = entry.rank <= 3;
    const style = isTopThree ? rankStyles[entry.rank as 1 | 2 | 3] : null;

    return (
        <div
            className={cn(
                'flex items-center gap-3 rounded-lg border border-cream-200 bg-white p-3 shadow-sm transition-all duration-200 hover:shadow-md',
                style?.bg,
                className
            )}
        >
            {/* Rank */}
            <div
                className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold',
                    style?.iconBg || 'bg-cream-100 text-slate-600'
                )}
            >
                {isTopThree ? style?.icon : `#${entry.rank}`}
            </div>

            {/* Avatar */}
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-navy-600 to-navy-800 text-xs font-semibold text-white">
                {entry.personnelName
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
            </div>

            {/* Name */}
            <div className="flex-1">
                <span className="font-medium text-navy-900">{entry.personnelName}</span>
            </div>

            {/* Score */}
            <div className="text-right">
                <span className="font-display text-lg font-bold text-navy-900">
                    {entry.score}
                </span>
                <span className="text-xs text-slate-500"> puan</span>
            </div>
        </div>
    );
}

/**
 * Mini Leaderboard for dashboard widget
 */
interface MiniLeaderboardProps {
    entries: LeaderboardEntry[];
    maxEntries?: number;
    className?: string;
}

export function MiniLeaderboard({ entries, maxEntries = 5, className }: MiniLeaderboardProps) {
    const displayEntries = entries.slice(0, maxEntries);

    return (
        <div className={cn('space-y-2', className)}>
            {displayEntries.map(entry => (
                <LeaderboardRow key={entry.personnelId} entry={entry} />
            ))}
        </div>
    );
}
