import { useEffect, useState } from 'react';
import { Pencil, Trash2, NotebookPen } from 'lucide-react';
import type { Book, Status } from '../lib/books';
import { statuses } from '../lib/books';
import type { BookChange } from '../lib/bookChanges';
import { localDateString } from '../lib/dates';
import { BookCover } from './BookCover';
import { Rating } from './ui/rating';
import { DatePicker } from './ui/date-picker';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { Field, Textarea } from './ui/field';
export function BookDetails({
  selected,
  setSelected,
  onEdit,
  onRemove,
  onUpdate,
  error,
  onDirtyChange,
}: {
  selected: Book;
  setSelected: (book: Book | null) => void;
  onEdit: (book: Book) => void;
  onRemove: (id: string) => boolean;
  onUpdate: (id: string, change: BookChange) => boolean;
  error: string;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState(selected.notes || '');
  const [confirmLeave, setConfirmLeave] = useState<
    'close' | 'edit' | 'notes' | null
  >(null);
  const notesDirty = notesOpen && notes !== (selected.notes || '');
  useEffect(() => {
    onDirtyChange(notesDirty);
    return () => onDirtyChange(false);
  }, [notesDirty, onDirtyChange]);
  function leave(action: 'close' | 'edit' | 'notes') {
    if (notesDirty) {
      setConfirmLeave(action);
      return;
    }
    finishLeave(action);
  }
  function finishLeave(action: 'close' | 'edit' | 'notes') {
    if (action === 'edit') onEdit(selected);
    else if (action === 'close') setSelected(null);
    else {
      setNotes(selected.notes || '');
      setNotesOpen(false);
    }
  }
  function status(next: Status) {
    onUpdate(selected.id, (current) => ({
      status: next,
      ...(next === 'finished' && !current.finishedAt
        ? {
            finishedAt:
              current.startedAt &&
              current.startedAt > localDateString(new Date())
                ? current.startedAt
                : localDateString(new Date()),
          }
        : {}),
    }));
  }
  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) leave('close');
        }}
        title={deleting ? 'Ta bort boken?' : selected.title}
        description={
          deleting
            ? 'Boken och dina anteckningar tas bort från biblioteket.'
            : selected.authors.join(', ') || 'Författare saknas'
        }
      >
        {deleting ? (
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
                  if (onRemove(selected.id)) setSelected(null);
                }}
              >
                Ta bort bok
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex gap-4">
              <BookCover
                title={selected.title}
                url={selected.coverUrl}
                compact
              />
              <div className="min-w-0 space-y-2">
                {selected.isbn && (
                  <p className="break-all text-xs text-muted-foreground">
                    ISBN {selected.isbn}
                  </p>
                )}
                {selected.startedAt && (
                  <p className="text-xs text-muted-foreground">
                    Började läsa {selected.startedAt}
                  </p>
                )}
                {selected.description && (
                  <details>
                    <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">
                      Om boken
                    </summary>
                    <p className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {selected.description}
                    </p>
                  </details>
                )}
              </div>
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Lässtatus</legend>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.entries(statuses).map(([value, label]) => (
                  <Button
                    key={value}
                    variant={selected.status === value ? 'default' : 'outline'}
                    aria-pressed={selected.status === value}
                    className="min-h-12 px-2"
                    onClick={() => status(value as Status)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </fieldset>
            {selected.status === 'finished' && (
              <DatePicker
                id="quick-finishedAt"
                label="Läste klart"
                value={selected.finishedAt}
                onChange={(finishedAt) => onUpdate(selected.id, { finishedAt })}
              />
            )}
            <Rating
              value={selected.rating}
              onChange={(rating) => onUpdate(selected.id, { rating })}
            />
            {notesOpen && (
              <form
                aria-label="Bokens anteckningar"
                className="space-y-3 rounded-lg bg-muted/40 p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (
                    onUpdate(selected.id, { notes: notes.trim() || undefined })
                  ) {
                    setNotesOpen(false);
                  }
                }}
              >
                <Field id="quick-notes" label="Egna anteckningar">
                  <Textarea
                    id="quick-notes"
                    value={notes}
                    autoFocus
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Skriv dina tankar…"
                  />
                </Field>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => leave('notes')}
                  >
                    Avbryt
                  </Button>
                  <Button type="submit">Spara anteckning</Button>
                </div>
              </form>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="grid grid-cols-3 gap-1 border-t pt-4">
              <Button
                variant="ghost"
                className="min-h-12 flex-col gap-1 px-1 py-2 text-xs sm:flex-row sm:text-sm"
                aria-label="Redigera bok"
                onClick={() => leave('edit')}
              >
                <Pencil />
                Redigera
              </Button>
              <Button
                variant="ghost"
                className="min-h-12 flex-col gap-1 px-1 py-2 text-xs sm:flex-row sm:text-sm"
                aria-expanded={notesOpen}
                aria-label={
                  selected.notes?.trim()
                    ? 'Anteckningar, sparad anteckning finns'
                    : 'Anteckningar'
                }
                onClick={() => {
                  if (notesOpen) leave('notes');
                  else {
                    setNotes(selected.notes || '');
                    setNotesOpen(true);
                  }
                }}
              >
                <span className="relative">
                  <NotebookPen />
                  {selected.notes?.trim() && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1 -right-1 size-2 rounded-full bg-primary ring-2 ring-card"
                    />
                  )}
                </span>
                Anteckningar
              </Button>
              <Button
                variant="ghost"
                className="min-h-12 flex-col gap-1 px-1 py-2 text-xs sm:flex-row sm:text-sm"
                onClick={() => setDeleting(true)}
              >
                <Trash2 />
                Ta bort
              </Button>
            </div>
          </div>
        )}
      </Dialog>
      <Dialog
        open={confirmLeave !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmLeave(null);
        }}
        title="Lämna osparad anteckning?"
        description="Anteckningen har inte sparats. Vill du lämna ändringarna?"
      >
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmLeave(null)}>
            Fortsätt skriva
          </Button>
          <Button
            onClick={() => {
              const action = confirmLeave;
              setConfirmLeave(null);
              if (action) finishLeave(action);
            }}
          >
            Lämna ändringarna
          </Button>
        </div>
      </Dialog>
    </>
  );
}
