import { useState } from 'react';
import { CloudUpload } from 'lucide-react';
import type { LibraryController } from '../lib/library';
import { Button } from './ui/button';
import { StatusBadge } from './StatusBadge';
export function LocalImportPanel({ library }: { library: LibraryController }) {
  const [reviewing, setReviewing] = useState(false);
  const imports = library.imports;
  const item = imports?.items[0];
  const busy = library.pending;
  if (
    !imports ||
    (!imports.loading && !item && !imports.error && !imports.notice)
  )
    return null;
  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <h4 className="flex items-center gap-2 text-sm font-medium">
        <CloudUpload className="size-4" />
        Importera lokala böcker
      </h4>
      {imports.loading ? (
        <p className="text-sm">Kontrollerar dina lokala böcker…</p>
      ) : item ? (
        <>
          <p className="text-sm text-muted-foreground">
            {imports.items.length} böcker återstår att granska. Dina lokala
            böcker behålls.
          </p>
          {!reviewing ? (
            <Button
              variant="outline"
              disabled={busy || library.blocked}
              onClick={() => setReviewing(true)}
            >
              Granska import
            </Button>
          ) : (
            <>
              <div>
                <p className="font-serif text-xl">{item.book.title}</p>
                <p className="mb-2 text-sm text-muted-foreground">
                  {item.book.authors.join(', ') || 'Författare saknas'}
                </p>
                <StatusBadge status={item.book.status} />
              </div>
              {item.matches.length > 0 && (
                <div className="space-y-2 rounded-md border p-3">
                  <p className="text-sm font-medium">
                    Boken kan redan finnas i molnbiblioteket.
                  </p>
                  {item.matches.map((match) => (
                    <div key={match.book.id} className="text-sm">
                      <p>{match.book.title}</p>
                      <StatusBadge status={match.book.status} />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={busy || library.blocked}
                  onClick={() => {
                    void imports.run(item, 'add', item.matches.length > 0);
                  }}
                >
                  {item.matches.length ? 'Importera ändå' : 'Importera bok'}
                </Button>
                <Button
                  variant="outline"
                  disabled={busy || library.blocked}
                  onClick={() => {
                    void imports.run(item, 'skip');
                  }}
                >
                  Hoppa över
                </Button>
              </div>
            </>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Inga lokala böcker återstår att importera.
        </p>
      )}
      {imports.error && (
        <p role="alert" className="text-sm text-destructive">
          {imports.error}
        </p>
      )}
      {imports.notice && (
        <p role="status" className="text-sm text-primary">
          {imports.notice}
        </p>
      )}
    </div>
  );
}
