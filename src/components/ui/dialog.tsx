import * as Primitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Primitive.Root open={open} onOpenChange={onOpenChange}>
      <Primitive.Portal>
        <Primitive.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Primitive.Content className="dialog-content fixed left-1/2 z-50 max-h-[min(90dvh,calc(var(--visible-height,100dvh)-2rem))] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border bg-card p-6 shadow-xl">
          <Primitive.Title className="pr-8 font-serif text-2xl">
            {title}
          </Primitive.Title>
          <Primitive.Description className="mt-2 text-sm text-muted-foreground">
            {description}
          </Primitive.Description>
          <Primitive.Close
            aria-label="Stäng"
            className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-md hover:bg-muted"
          >
            <X className="size-5" />
          </Primitive.Close>
          <div className="mt-6">{children}</div>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
