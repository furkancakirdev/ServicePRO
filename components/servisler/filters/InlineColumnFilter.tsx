'use client';

import { ReactNode } from 'react';
import { Funnel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type InlineColumnFilterProps = {
  baslik: string;
  aktifFiltreSayisi: number;
  dataTestId: string;
  children: ReactNode;
};

export function InlineColumnFilter({
  baslik,
  aktifFiltreSayisi,
  dataTestId,
  children,
}: InlineColumnFilterProps) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
          data-testid={`${dataTestId}-trigger`}
          onClick={(event) => event.stopPropagation()}
        >
          <Funnel className="mr-1 h-3.5 w-3.5" />
          {baslik}
          {aktifFiltreSayisi > 0 ? ` (${aktifFiltreSayisi})` : ''}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-72 border-border bg-popover text-popover-foreground"
        data-testid={`${dataTestId}-content`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
