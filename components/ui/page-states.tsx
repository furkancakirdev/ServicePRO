import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PageStateProps {
  title: string;
  description?: string;
  className?: string;
  action?: ReactNode;
}

export function PageEmptyState({ title, description, className, action }: PageStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--color-border)]/70 bg-[var(--color-surface)]/20 p-8 text-center',
        className
      )}
    >
      <Inbox className="h-10 w-10 text-muted-foreground" />
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}

interface PageErrorStateProps extends PageStateProps {
  onRetry?: () => void;
}

export function PageErrorState({
  title,
  description,
  className,
  action,
  onRetry,
}: PageErrorStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-8 text-center',
        className
      )}
    >
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            Tekrar Dene
          </Button>
        ) : null}
        {action}
      </div>
    </div>
  );
}

interface PageLoadingStateProps {
  label?: string;
  className?: string;
}

export function PageLoadingState({ label = 'Yukleniyor...', className }: PageLoadingStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-lg border border-[var(--color-border)]/70 bg-[var(--color-surface)]/20 p-8 text-center',
        className
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
