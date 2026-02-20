import Link from 'next/link';
import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { cn } from '@/lib/utils';

type BreadcrumbItem = {
  label: string;
  href?: string;
};

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  rightActions?: ReactNode;
  showNotificationBell?: boolean;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  rightActions,
  showNotificationBell = true,
  children,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('surface-panel p-4 sm:p-5 lg:p-6', className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              {breadcrumbs.map((item, index) => (
                <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
                  {item.href ? (
                    <Link href={item.href} className="hover:text-foreground transition-colors">
                      {item.label}
                    </Link>
                  ) : (
                    <span>{item.label}</span>
                  )}
                  {index < breadcrumbs.length - 1 ? <ChevronRight className="h-3 w-3" /> : null}
                </span>
              ))}
            </nav>
          ) : null}

          <div>
            <h1 className="page-title !mb-0">{title}</h1>
            {description ? <p className="page-subtitle mt-1">{description}</p> : null}
          </div>
        </div>

        {rightActions || showNotificationBell ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
            {rightActions}
            {showNotificationBell ? <NotificationBell /> : null}
          </div>
        ) : null}
      </div>

      {children ? <div className="mt-4 border-t border-border/70 pt-4">{children}</div> : null}
    </header>
  );
}
