import type { Duplicate } from '../lib/duplicates';
import type { Book } from '../lib/books';
import { Dialog } from './ui/dialog';
import { Button } from './ui/button';
import { StatusBadge } from './StatusBadge';
export function DuplicateDialog({
  matches,
  onCancel,
  onView,
  onConfirm,
}: {
  matches: Duplicate[];
  onCancel: () => void;
  onView: (book: Book) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={matches.length > 0}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      title="Finns boken redan?"
      description="Det kan vara en annan utgåva. Du kan alltid lägga till boken ändå."
    >
      <div className="space-y-4">
        {matches.map(({ book, reason }) => (
          <div key={book.id} className="space-y-3 rounded-lg border p-4">
            <div>
              <h3 className="font-serif text-xl">{book.title}</h3>
              <p className="text-sm text-muted-foreground">
                {book.authors.join(', ') || 'Författare saknas'}
              </p>
            </div>
            <StatusBadge status={book.status} />
            <p className="text-sm">
              {reason === 'isbn'
                ? 'Samma ISBN finns redan.'
                : reason === 'title-author'
                  ? 'Samma titel och författare finns redan.'
                  : 'Samma titel finns redan, men författaren kan skilja sig.'}{' '}
              {book.status === 'finished'
                ? 'Du verkar redan ha läst den här boken.'
                : book.status === 'reading'
                  ? 'Boken finns bland böckerna du läser.'
                  : 'Boken finns på din lista över böcker du vill läsa.'}
            </p>
            <Button variant="outline" onClick={() => onView(book)}>
              Visa befintlig bok
            </Button>
          </div>
        ))}
        <div className="flex flex-wrap justify-end gap-3 border-t pt-4">
          <Button variant="outline" onClick={onCancel}>
            Avbryt
          </Button>
          <Button onClick={onConfirm}>Lägg till ändå</Button>
        </div>
      </div>
    </Dialog>
  );
}
