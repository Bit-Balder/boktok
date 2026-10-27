import * as Primitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
export function Select({
  value,
  onValueChange,
  options,
  label,
  id,
  name,
  className,
  disabled,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  label: string;
  id?: string;
  name?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Primitive.Root
      value={value}
      onValueChange={onValueChange}
      name={name}
      disabled={disabled}
    >
      <Primitive.Trigger
        id={id}
        aria-label={label}
        className={cn(
          'flex min-h-12 w-full items-center justify-between gap-3 rounded-md border bg-card px-3 py-3 text-left text-sm disabled:opacity-50',
          className,
        )}
      >
        <Primitive.Value />
        <Primitive.Icon>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </Primitive.Icon>
      </Primitive.Trigger>
      <Primitive.Portal>
        <Primitive.Content
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          className="z-[80] max-h-[min(20rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border bg-card text-foreground shadow-xl"
        >
          <Primitive.ScrollUpButton className="flex justify-center p-2">
            <ChevronUp className="size-4" />
          </Primitive.ScrollUpButton>
          <Primitive.Viewport className="p-1.5">
            {options.map((option) => (
              <Primitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="relative flex min-h-12 cursor-pointer items-center rounded-md py-3 pr-10 pl-3 text-sm outline-none data-[highlighted]:bg-muted data-[disabled]:opacity-40"
              >
                <Primitive.ItemText>{option.label}</Primitive.ItemText>
                <Primitive.ItemIndicator className="absolute right-3">
                  <Check className="size-4 text-primary" />
                </Primitive.ItemIndicator>
              </Primitive.Item>
            ))}
          </Primitive.Viewport>
          <Primitive.ScrollDownButton className="flex justify-center p-2">
            <ChevronDown className="size-4" />
          </Primitive.ScrollDownButton>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
