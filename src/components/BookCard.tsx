import { BookCover } from './BookCover';
import type { Book } from '../lib/books';
import { RatingDisplay } from './ui/rating';
import { StatusBadge } from './StatusBadge';
export function BookCard({ book, onOpen }: { book: Book; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      aria-label={`Visa ${book.title}`}
      className="group overflow-hidden rounded-lg border bg-card text-left transition-shadow hover:shadow-md"
    >
      <div className="flex h-52 items-center justify-center bg-muted/60 p-5 sm:h-60">
        <BookCover title={book.title} url={book.coverUrl} />
      </div>
      <div className="space-y-3 p-4">
        <StatusBadge status={book.status} />
        <div>
          <h3 className="line-clamp-2 font-serif text-xl group-hover:text-primary">
            {book.title}
          </h3>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {book.authors.join(', ') || 'Författare saknas'}
          </p>
        </div>
        {book.rating ? <RatingDisplay value={book.rating} /> : null}
      </div>
    </button>
  );
}
