import { Library, Plus, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
export function BottomNav({
  editing,
  settings,
  blocked,
  onLibrary,
  onAdd,
  onSettings,
}: {
  editing: boolean;
  settings: boolean;
  blocked: boolean;
  onLibrary: () => void;
  onAdd: () => void;
  onSettings: () => void;
}) {
  return (
    <nav
      aria-label="Huvudnavigering"
      className="app-bottom-nav fixed inset-x-0 z-20 border-t bg-card pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto grid max-w-xl grid-cols-3 gap-2 px-3 py-2">
        {[
          {
            label: 'Mitt bibliotek',
            Icon: Library,
            action: onLibrary,
            active: !editing && !settings,
          },
          {
            label: 'Lägg till bok',
            Icon: Plus,
            action: onAdd,
            active: editing && !settings,
            disabled: blocked,
          },
          {
            label: 'Inställningar',
            Icon: Settings,
            action: onSettings,
            active: settings,
          },
        ].map(({ label, Icon, action, active, disabled }) => (
          <button
            key={label}
            type="button"
            disabled={disabled}
            aria-current={active ? 'page' : undefined}
            onClick={action}
            className={cn(
              'flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors disabled:opacity-50',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            <Icon className="size-5" />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
