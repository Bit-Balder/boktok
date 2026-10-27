import { statuses, type Status } from '../lib/books';
import { cn } from '../lib/utils';
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
        status === 'finished'
          ? 'bg-primary/10 text-primary'
          : status === 'reading'
            ? 'bg-amber-100 text-amber-900'
            : 'bg-muted text-muted-foreground',
      )}
    >
      {statuses[status]}
    </span>
  );
}
