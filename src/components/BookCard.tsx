import { useId } from 'react';
import { NotebookPen } from 'lucide-react';
import { BookCover } from './BookCover';
import type { Book } from '../lib/books';
import { RatingDisplay } from './ui/rating';
import { StatusBadge } from './StatusBadge';
export function BookCard({ book, onOpen }: { book: Book; onOpen: () => void }) {
  const noteId = useId();
  const hasNotes = Boolean(book.notes?.trim());
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Visa ${book.title}`}
      aria-describedby={hasNotes ? noteId : undefined}
      className="@container group flex flex-col overflow-hidden rounded-lg border bg-card text-left transition-shadow hover:shadow-md"
    >
      <div className="flex h-52 shrink-0 items-center justify-center bg-muted/60 p-5 sm:h-60">
        <BookCover title={book.title} url={book.coverUrl} />
      </div>
      <div className="relative flex-1 space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <StatusBadge status={book.status} compact />
          {book.rating ? <RatingDisplay value={book.rating} compact /> : null}
        </div>
        <div className={hasNotes ? 'pr-5' : undefined}>
          <h3 className="line-clamp-2 font-serif text-xl group-hover:text-primary">
            {book.title}
          </h3>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {book.authors.join(', ') || 'Författare saknas'}
          </p>
        </div>
        {hasNotes && (
          <span
            className="absolute right-3 bottom-3 text-muted-foreground"
            title="Har en anteckning"
          >
            <NotebookPen aria-hidden="true" className="size-4" />
            <span id={noteId} className="sr-only">
              Har en sparad anteckning
            </span>
          </span>
        )}
      </div>
    </button>
  );
}
