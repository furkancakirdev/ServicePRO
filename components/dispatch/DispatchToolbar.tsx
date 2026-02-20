'use client';

import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DispatchView } from './types';

type Props = {
  view: DispatchView;
  rangeLabel: string;
  dense: boolean;
  refreshing: boolean;
  onViewChange: (view: DispatchView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onRefresh: () => void;
  onDenseToggle: () => void;
};

export function DispatchToolbar({
  view,
  rangeLabel,
  dense,
  refreshing,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  onRefresh,
  onDenseToggle,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={view === 'day' ? 'default' : 'outline'}
          onClick={() => onViewChange('day')}
          data-testid="dispatch-view-day"
        >
          Day
        </Button>
        <Button
          size="sm"
          variant={view === 'week' ? 'default' : 'outline'}
          onClick={() => onViewChange('week')}
          data-testid="dispatch-view-week"
        >
          Week
        </Button>

        <Button size="sm" variant="outline" onClick={onPrev} aria-label="Previous">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={onToday}>
          Today
        </Button>
        <Button size="sm" variant="outline" onClick={onNext} aria-label="Next">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-foreground">{rangeLabel}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={onDenseToggle} data-testid="dispatch-density-toggle">
          {dense ? 'Dense: ON' : 'Dense: OFF'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onRefresh}
          disabled={refreshing}
          data-testid="dispatch-refresh"
          className={cn(refreshing ? 'opacity-80' : '')}
        >
          {refreshing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
          Refresh
        </Button>
      </div>
    </div>
  );
}

export default DispatchToolbar;
