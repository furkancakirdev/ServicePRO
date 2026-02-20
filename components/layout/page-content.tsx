import { type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageContentProps extends ComponentPropsWithoutRef<'div'> {
  children: ReactNode;
}

export function PageContent({ children, className, ...props }: PageContentProps) {
  return (
    <div
      {...props}
      className={cn('mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 lg:px-6', className)}
    >
      {children}
    </div>
  );
}
