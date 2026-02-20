'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatDateTimeForUi } from '@/lib/timezone';

type ConflictPayload = {
  id: string;
  servisId: string;
  baslangicAt: string;
  bitisAt: string;
  status: string;
  servis: {
    tekneAdi: string;
    servisAciklamasi: string;
  };
};

type Props = {
  open: boolean;
  conflict: ConflictPayload | null;
  onClose: () => void;
};

export function ConflictDialog({ open, conflict, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cakişma Tespit Edildi</DialogTitle>
          <DialogDescription>
            Secilen teknisyen ve saat araliginda baska bir appointment mevcut.
          </DialogDescription>
        </DialogHeader>

        {conflict ? (
          <div className="rounded-md border border-border/70 p-3 text-sm">
            <p className="font-semibold text-foreground">{conflict.servis.tekneAdi}</p>
            <p className="mt-1 text-muted-foreground">{conflict.servis.servisAciklamasi}</p>
            <p className="mt-2 text-muted-foreground">
              {formatDateTimeForUi(conflict.baslangicAt)} - {formatDateTimeForUi(conflict.bitisAt)}
            </p>
            <p className="mt-1 text-muted-foreground">Status: {conflict.status}</p>
          </div>
        ) : null}

        <DialogFooter>
          <Button onClick={onClose}>Tamam</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConflictDialog;
