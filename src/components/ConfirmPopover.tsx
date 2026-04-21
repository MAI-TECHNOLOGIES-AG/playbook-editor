"use client";

import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverDescription,
    PopoverHeader,
    PopoverTitle,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ReactElement, ReactNode } from "react";
import {
    forwardRef,
    useCallback,
    useImperativeHandle,
    useState,
} from "react";

export type ConfirmPopoverHandle = {
  open: () => void;
  close: () => void;
};

type ConfirmPopoverProps = {
  /** When set, the popover is controlled by the parent. When omitted, open state is kept inside this component (initially closed). Use the ref `open()` / `close()` methods or `onOpenChange` notifications to drive it from outside. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  /** Optional content between the title/description and the action buttons (replaces ConfirmDialog’s optional `children` body slot). */
  body?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  isConfirming?: boolean;
  confirmDisabled?: boolean;
  /** Element that opens the popover; must be a single React element (passed to `PopoverTrigger` with `asChild`). */
  children: ReactElement;
  /** Extra classes for the popover surface (width, alignment overrides, etc.). */
  contentClassName?: string;
};

export const ConfirmPopover = forwardRef<
  ConfirmPopoverHandle | null,
  ConfirmPopoverProps
>(function ConfirmPopover(
  {
    open: openProp,
    onOpenChange,
    onConfirm,
    title,
    description,
    body,
    confirmText = "Confirm",
    cancelText = "Cancel",
    isConfirming = false,
    confirmDisabled = false,
    children,
    contentClassName,
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
    <Popover onOpenChange={handleOpenChange} open={open}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-[min(100vw-2rem,18rem)] gap-3 p-3 sm:max-w-xs",
          contentClassName,
        )}
      >
        <PopoverHeader>
          <PopoverTitle>{title}</PopoverTitle>
          {description ? (
            <PopoverDescription>{description}</PopoverDescription>
          ) : null}
        </PopoverHeader>

        {body ? (
          <div className="text-muted-foreground text-sm">{body}</div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
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
        </div>
      </PopoverContent>
    </Popover>
  );
});
