/**
 * GDPR Confirm Dialog
 *
 * Dialog di conferma riutilizzabile basato sulle primitive design-system.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';

interface GDPRConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Variante distruttiva per azioni irreversibili */
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}

export const GDPRConfirmDialog: React.FC<GDPRConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Conferma',
  cancelLabel = 'Annulla',
  destructive = false,
  loading = false,
  onConfirm
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription asChild><div>{description}</div></DialogDescription>}
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'primary'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Attendere…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GDPRConfirmDialog;
