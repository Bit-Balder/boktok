import { useState } from 'react';
import { Pencil, Trash2, ArrowLeft } from 'lucide-react';
import type { Book } from '../lib/books';
import { StatusBadge } from './StatusBadge';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
export function BookDetails({
  selected,
  setSelected,
  onEdit,
  onRemove,
  error,
}: {
  selected: Book;
  setSelected: (book: Book | null) => void;
  onEdit: (book: Book) => void;
  onRemove: (id: string) => boolean;
  error: string;
}) {
  const [deleting, setDeleting] = useState(false);
  return (
    <Dialog
      open={selected !== null}
      onOpenChange={(open) => {
        if (!open) {
          setSelected(null);
          setDeleting(false);
        }
      }}
      title={deleting ? 'Ta bort boken?' : selected?.title || 'Bokdetaljer'}
      description={
        deleting
          ? 'Boken och dina anteckningar tas bort från biblioteket.'
          : selected?.authors.join(', ') || 'Författare saknas'
      }
    >
      {selected &&
        (deleting ? (
          <div className="space-y-5">
            <p className="text-sm">
              Vill du ta bort ”{selected.title}”? Det går inte att ångra.
            </p>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleting(false)}>
                Avbryt
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (onRemove(selected.id)) {
                    setSelected(null);
                    setDeleting(false);
                  }
                }}
              >
                Ta bort bok
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <StatusBadge status={selected.status} />
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['ISBN', selected.isbn],
                [
                  'Betyg',
                  selected.rating ? `${selected.rating} av 5` : undefined,
                ],
                ['Började läsa', selected.startedAt],
                ['Läste klart', selected.finishedAt],
              ].map(([label, value]) =>
                value ? (
                  <div key={label}>
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="mt-1">{value}</dd>
                  </div>
                ) : null,
              )}
            </dl>
            {selected.description && (
              <section>
                <h3 className="mb-2 text-sm font-semibold">Om boken</h3>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {selected.description}
                </p>
              </section>
            )}
            {selected.notes && (
              <section className="rounded-md bg-muted/60 p-4">
                <h3 className="mb-2 text-sm font-semibold">
                  Mina anteckningar
                </h3>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {selected.notes}
                </p>
              </section>
            )}
            <div className="flex flex-wrap gap-2 border-t pt-5">
              <Button
                onClick={() => {
                  onEdit(selected);
                  setSelected(null);
                }}
              >
                <Pencil />
                Redigera bok
              </Button>
              <Button variant="ghost" onClick={() => setDeleting(true)}>
                <Trash2 />
                Ta bort
              </Button>
              <Button variant="ghost" onClick={() => setSelected(null)}>
                <ArrowLeft />
                Tillbaka
              </Button>
            </div>
          </div>
        ))}
    </Dialog>
  );
}
