import type { ReactNode } from 'react';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type ConfirmDialogHandle = {
  open: () => void;
  close: () => void;
};

type ConfirmDialogProps = {
  /** When set, the dialog is controlled by the parent. When omitted, open state is kept inside this component (initially closed). Use the ref `open()` / `close()` methods or `onOpenChange` notifications to drive it from outside. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isConfirming?: boolean;
  confirmDisabled?: boolean;
  children?: ReactNode;
};

export const ConfirmDialog = forwardRef<
  ConfirmDialogHandle | null,
  ConfirmDialogProps
>(function ConfirmDialog(
  {
    open: openProp,
    onOpenChange,
    onConfirm,
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isConfirming = false,
    confirmDisabled = false,
    children,
  },
  ref,
) {
  const isControlled = openProp !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? openProp : internalOpen;

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  useImperativeHandle(
    ref,
    () => ({
      open: () => handleOpenChange(true),
      close: () => handleOpenChange(false),
    }),
    [handleOpenChange],
  );

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {children && (
          <div className="text-muted-foreground text-sm">{children}</div>
        )}

        <DialogFooter>
          <Button
            disabled={isConfirming}
            onClick={() => handleOpenChange(false)}
            type="button"
            variant="outline"
          >
            {cancelText}
          </Button>
          <Button
            disabled={confirmDisabled || isConfirming}
            onClick={() => {
              const result = onConfirm();
              if (!isControlled) {
                void Promise.resolve(result).finally(() => {
                  handleOpenChange(false);
                });
              }
            }}
            type="button"
            variant="destructive"
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
