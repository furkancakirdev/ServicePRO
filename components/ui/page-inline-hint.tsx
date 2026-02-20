'use client';

import Link from 'next/link';
import { Lightbulb, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PageActionModel, UiHintConfig } from '@/types/ui';
import { useUiRedesign } from '@/components/ui/ui-redesign-provider';

interface PageInlineHintProps {
  hint: UiHintConfig;
  action?: PageActionModel;
  className?: string;
}

export function PageInlineHint({ hint, action, className }: PageInlineHintProps) {
  const { enabled, hintsVisible, setHintsVisible } = useUiRedesign();

  if (!enabled || !hintsVisible) return null;

  return (
    <section className={cn('task-hint', className)} data-testid={`inline-hint-${hint.id}`}>
      <div className="task-hint__content">
        <p className="task-hint__label">
          <Lightbulb className="h-4 w-4" />
          Ne yapmaliyim?
        </p>
        <h2 className="task-hint__title">{hint.title}</h2>
        <p className="task-hint__description">{hint.description}</p>

        {hint.steps && hint.steps.length > 0 ? (
          <ul className="task-hint__steps">
            {hint.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="task-hint__actions">
        {action?.href ? (
          <Link href={action.href}>
            <Button size="sm">{action.label}</Button>
          </Link>
        ) : null}
        <Button variant="outline" size="sm" onClick={() => setHintsVisible(false)}>
          <X className="mr-1 h-3.5 w-3.5" />
          Ipucunu kapat
        </Button>
      </div>
    </section>
  );
}
