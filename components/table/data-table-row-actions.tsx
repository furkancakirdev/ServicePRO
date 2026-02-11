'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Row } from '@tanstack/react-table';
import { MoreHorizontal, PencilLine, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ServiceGridRow } from '@/components/services/types';

interface DataTableRowActionsProps {
  row: Row<ServiceGridRow>;
  onDeleted?: (serviceId: string) => void;
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const DataTableRowActions = React.memo(function DataTableRowActions({
  row,
  onDeleted,
}: DataTableRowActionsProps) {
  const router = useRouter();
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const service = row.original;

  const handleDelete = React.useCallback(async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      const authHeaders = getAuthHeaders();
      let response = await fetch(`/api/services/${service.id}`, {
        method: 'DELETE',
        headers: {
          ...authHeaders,
        },
      });

      if (response.status === 401 && authHeaders.Authorization) {
        response = await fetch(`/api/services/${service.id}`, {
          method: 'DELETE',
        });
      }

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Servis silinemedi');
      }

      onDeleted?.(service.id);
      toast.success('Servis kaydi silindi');
      setIsDeleteOpen(false);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Silme islemi basarisiz';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }, [isDeleting, onDeleted, router, service.id]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="sr-only">Satir islemleri</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-52 border-slate-800 bg-slate-900 text-slate-100"
          onClick={(event) => event.stopPropagation()}
        >
          <DropdownMenuLabel>Islemler</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push(`/servisler/${service.id}/duzenle`)}>
            <PencilLine className="mr-2 h-4 w-4" />
            Duzenle
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-500 focus:bg-red-500/10 focus:text-red-400"
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Sil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent onClick={(event) => event.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Servis kaydi silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{service.tekneAdi}</span> kaydi soft delete ile
              kaldirilacak. Bu islem geri alinabilir ama listeden aninda duser.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Vazgec</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? 'Siliniyor...' : 'Evet, Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
