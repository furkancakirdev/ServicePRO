'use client';

import { Column } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

type FacetedOption = {
  label: string;
  value: string;
};

interface DataTableFacetedFilterProps<TData, TValue> {
  title: string;
  column?: Column<TData, TValue>;
  options: FacetedOption[];
}

export function DataTableFacetedFilter<TData, TValue>({
  title,
  column,
  options,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const selectedValues = new Set((column?.getFilterValue() as string[] | undefined) ?? []);
  const facetValues = column?.getFacetedUniqueValues();

  const toggleValue = (value: string) => {
    const next = new Set(selectedValues);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }

    const values = Array.from(next);
    column?.setFilterValue(values.length ? values : undefined);
  };

  const clearValues = () => column?.setFilterValue(undefined);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          {title}
          {selectedValues.size > 0 ? ` (${selectedValues.size})` : ''}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-56 border-slate-800 bg-slate-900 text-slate-100"
      >
        <DropdownMenuLabel>{title}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto pr-1">
          {options.map((option) => {
            const count = facetValues?.get(option.value) ?? 0;
            return (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={selectedValues.has(option.value)}
                onCheckedChange={() => toggleValue(option.value)}
              >
                <span className="mr-2 flex-1">{option.label}</span>
                <span className="text-xs text-muted-foreground">{count}</span>
              </DropdownMenuCheckboxItem>
            );
          })}
        </div>
        {selectedValues.size > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={false} onCheckedChange={clearValues}>
              Tümünü Temizle
            </DropdownMenuCheckboxItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
