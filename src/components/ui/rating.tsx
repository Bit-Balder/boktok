import { useRef } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';
export function RatingDisplay({
  value,
  compact = false,
}: {
  value: number;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0',
        compact ? 'gap-px @min-[10rem]:gap-0.5' : 'gap-1',
      )}
      role="img"
      aria-label={`Betyg ${value} av 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={cn(
            compact ? 'size-2.5 @min-[10rem]:size-3' : 'size-4',
            n <= value ? 'fill-primary text-primary' : 'text-muted-foreground',
          )}
        />
      ))}
    </span>
  );
}
export function Rating({
  value,
  onChange,
}: {
  value?: number;
  onChange: (value: number | undefined) => void;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Betyg</legend>
      <div className="flex flex-wrap items-center gap-x-2">
        <div className="flex" role="radiogroup" aria-label="Betyg">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-label={`${n} av 5 stjärnor`}
              aria-checked={value === n}
              tabIndex={value === n || (!value && n === 1) ? 0 : -1}
              ref={(node) => {
                buttons.current[n - 1] = node;
              }}
              onClick={() => onChange(value === n ? undefined : n)}
              onKeyDown={(event) => {
                const keys = [
                  'ArrowRight',
                  'ArrowDown',
                  'ArrowLeft',
                  'ArrowUp',
                  'Home',
                  'End',
                ];
                if (!keys.includes(event.key)) return;
                event.preventDefault();
                const next =
                  event.key === 'Home'
                    ? 1
                    : event.key === 'End'
                      ? 5
                      : ((n -
                          1 +
                          (event.key === 'ArrowRight' ||
                          event.key === 'ArrowDown'
                            ? 1
                            : 4)) %
                          5) +
                        1;
                onChange(next);
                buttons.current[next - 1]?.focus();
              }}
              className="flex size-11 items-center justify-center rounded-md hover:bg-muted"
            >
              <Star
                aria-hidden="true"
                className={cn(
                  'size-7',
                  n <= (value || 0)
                    ? 'fill-primary text-primary'
                    : 'text-muted-foreground',
                )}
              />
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          disabled={!value}
          onClick={() => onChange(undefined)}
        >
          Rensa betyg
        </Button>
      </div>
      <p aria-live="polite" className="text-xs text-muted-foreground">
        {value ? `${value} av 5 stjärnor` : 'Inget betyg valt'}
      </p>
    </fieldset>
  );
}
