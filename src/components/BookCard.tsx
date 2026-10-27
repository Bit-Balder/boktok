import { useState } from 'react';
import { BookOpen, Star } from 'lucide-react';
import type { Book } from '../lib/books';
import { StatusBadge } from './StatusBadge';
export function BookCard({ book, onOpen }: { book: Book; onOpen: () => void }) {
  const [failed, setFailed] = useState(false);
  return (
    <button
      onClick={onOpen}
      aria-label={`Visa ${book.title}`}
      className="group overflow-hidden rounded-lg border bg-card text-left transition-shadow hover:shadow-md"
    >
      <div className="flex h-52 items-center justify-center bg-muted/60 p-5 sm:h-60">
        {book.coverUrl && !failed ? (
          <img
            src={book.coverUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="h-full max-w-full rounded-sm object-contain shadow-md"
          />
        ) : (
          <div className="flex h-full w-32 flex-col items-center justify-center gap-4 rounded-r-md border-l-4 border-primary/30 bg-primary/10 p-4 text-center text-primary">
            <BookOpen className="size-7" />
            <span className="line-clamp-3 font-serif text-lg">
              {book.title}
            </span>
          </div>
        )}
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
        {book.rating ? (
          <div
            className="flex items-center gap-1 text-sm text-muted-foreground"
            aria-label={`Betyg ${book.rating} av 5`}
          >
            <Star className="size-4 fill-primary text-primary" />
            {book.rating} / 5
          </div>
        ) : null}
      </div>
    </button>
  );
}
