import { statuses, type Status } from '../lib/books';
import { cn } from '../lib/utils';
export function StatusBadge({
  status,
  compact = false,
}: {
  status: Status;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 whitespace-nowrap rounded-full py-1 font-medium',
        compact
          ? 'px-1.5 text-[0.625rem] @min-[10rem]:px-2.5 @min-[10rem]:text-xs'
          : 'px-2.5 text-xs',
        status === 'finished'
          ? 'bg-primary/10 text-primary'
          : status === 'reading'
            ? 'bg-muted text-foreground'
            : 'bg-muted text-muted-foreground',
      )}
    >
      {statuses[status]}
    </span>
  );
}
