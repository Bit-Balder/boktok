import { Star } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';
export function RatingDisplay({ value }: { value: number }) {
  return (
    <span
      className="inline-flex gap-1"
      role="img"
      aria-label={`Betyg ${value} av 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={cn(
            'size-4',
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
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Betyg</legend>
      <div className="flex flex-wrap items-center gap-x-2">
        <div className="flex" role="radiogroup" aria-label="Betyg">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              className="relative flex size-11 cursor-pointer items-center justify-center rounded-md hover:bg-muted"
            >
              <input
                type="radio"
                name="rating"
                value={n}
                aria-label={`${n} av 5 stjärnor`}
                checked={value === n}
                onChange={() => onChange(n)}
                className="peer sr-only"
              />
              <Star
                aria-hidden="true"
                className={cn(
                  'size-7 rounded-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ring',
                  n <= (value || 0)
                    ? 'fill-primary text-primary'
                    : 'text-muted-foreground',
                )}
              />
            </label>
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
