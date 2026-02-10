import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './index';
import { cn } from '@/lib/utils';

interface TablePaginationProps {
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  rowsPerPage: number;
  onRowsPerPageChange: (rows: number) => void;
  className?: string;
}

export function TablePagination({
  total,
  page,
  onPageChange,
  rowsPerPage,
  onRowsPerPageChange,
  className,
}: TablePaginationProps) {
  const totalPages = React.useMemo(() => {
    return Math.ceil(total / rowsPerPage);
  }, [total, rowsPerPage]);

  if (totalPages <= 0) return null;

  const startItem = total > 0 ? page * rowsPerPage + 1 : 0;
  const endItem = Math.min((page + 1) * rowsPerPage, total);

  return (
    <div className={cn('flex items-center justify-between gap-4 py-4', className)}>
      <div className="text-sm text-muted-foreground">
        <span className="hidden sm:inline">
          Toplam <strong>{total}</strong> kayıt arasından <strong>{startItem}-{endItem}</strong> gösteriliyor
        </span>
        <span className="sm:hidden">
          {startItem}-{endItem} / {total}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={rowsPerPage.toString()}
          onValueChange={(value) => onRowsPerPageChange(Number(value))}
        >
          <SelectTrigger className="h-8 w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 / sayfa</SelectItem>
            <SelectItem value="25">25 / sayfa</SelectItem>
            <SelectItem value="50">50 / sayfa</SelectItem>
            <SelectItem value="100">100 / sayfa</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(0)}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            <ChevronLeft className="h-4 w-4 -ml-2" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="flex items-center gap-1 px-2 text-sm">
            <span className="font-medium">{page + 1}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{totalPages}</span>
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(totalPages - 1)}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight className="h-4 w-4" />
            <ChevronRight className="h-4 w-4 -ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
