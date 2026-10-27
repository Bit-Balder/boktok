import { RefreshCw, Monitor, Sun, Moon } from 'lucide-react';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { useTheme, type Theme } from '../hooks/useTheme';
import { cn } from '../lib/utils';
export function Settings({
  open,
  onOpenChange,
  onRefresh,
  busy = false,
  cloud = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
  busy?: boolean;
  cloud?: boolean;
}) {
  const { theme, choose, error } = useTheme();
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Inställningar"
      description="Gör Boktok till ditt eget bibliotek."
    >
      <div className="space-y-7">
        <fieldset>
          <legend className="mb-3 text-sm font-semibold">Utseende</legend>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { value: 'system', label: 'Följ systemet', Icon: Monitor },
                { value: 'light', label: 'Ljust', Icon: Sun },
                { value: 'dark', label: 'Mörkt', Icon: Moon },
              ] as const
            ).map(({ value, label, Icon }) => (
              <label
                key={value}
                className={cn(
                  'relative flex cursor-pointer flex-col items-center gap-3 rounded-lg border px-2 py-5 text-center text-xs sm:text-sm',
                  theme === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'hover:bg-muted',
                )}
              >
                <input
                  className="peer sr-only"
                  type="radio"
                  name="theme"
                  value={value}
                  checked={theme === value}
                  onChange={() => choose(value as Theme)}
                />
                <Icon className="size-6 rounded-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ring" />
                {label}
              </label>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Ditt val gäller på den här enheten.
          </p>
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <section className="border-t pt-5">
          <h3 className="mb-2 text-sm font-semibold">
            Hämta senaste versionen
          </h3>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            Ladda om appen när du använder genvägen på hemskärmen. Dina sparade
            böcker finns kvar.
          </p>
          <Button variant="outline" disabled={busy} onClick={onRefresh}>
            <RefreshCw />
            Uppdatera appen
          </Button>
        </section>
        <p className="text-xs text-muted-foreground">
          Boktok 0.4 ·{' '}
          {cloud
            ? 'Ditt konto har ett privat molnbibliotek.'
            : 'Gästböcker sparas i den här webbläsaren.'}
        </p>
      </div>
    </Dialog>
  );
}
