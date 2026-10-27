import { useState } from 'react';
import { Search, Library, ShieldCheck } from 'lucide-react';
import {
  selectBooks,
  statuses,
  type Book,
  type BookFilters,
  type Sort,
  type Status,
} from '../lib/books';
import { ReadingStats } from './ReadingStats';
import { readingYears } from '../lib/statistics';
import { BookCard } from './BookCard';
import { Button } from './ui/button';
import { Input } from './ui/field';
import { Select } from './ui/select';
import { cn } from '../lib/utils';
export function LibraryView({
  books,
  blocked,
  error,
  notice,
  onOpen,
  cloud = false,
}: {
  books: Book[];
  blocked: boolean;
  error: string;
  notice: string;
  onOpen: (book: Book) => void;
  cloud?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status | 'all'>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [rating, setRating] =
    useState<NonNullable<BookFilters['rating']>>('all');
  const [notes, setNotes] = useState<NonNullable<BookFilters['notes']>>('all');
  const [year, setYear] = useState('all');
  const visible = selectBooks(books, query, status, sort, {
    rating,
    notes,
    year,
  });
  const filtered = Boolean(
    query ||
    status !== 'all' ||
    rating !== 'all' ||
    notes !== 'all' ||
    year !== 'all',
  );
  function resetFilters() {
    setQuery('');
    setStatus('all');
    setRating('all');
    setNotes('all');
    setYear('all');
  }
  const filters: [Status | 'all', string][] = [
    ['all', 'Alla böcker'],
    ...(Object.entries(statuses) as [Status, string][]),
  ];
  return (
    <>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            Dina böcker. Din läsning.
          </p>
          <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">
            Mitt bibliotek
          </h1>
          <p className="mt-4 max-w-lg text-muted-foreground">
            En plats för berättelser du älskar och böcker du vill upptäcka.
          </p>
        </div>
      </div>
      <div className="mb-8 grid grid-cols-3 gap-3 sm:gap-5">
        {(['want_to_read', 'reading', 'finished'] as Status[]).map((s) => (
          <div key={s} className="rounded-lg border bg-card p-4 sm:p-5">
            <p className="text-xs text-muted-foreground sm:text-sm">
              {statuses[s]}
            </p>
            <p className="mt-2 font-serif text-3xl">
              {books.filter((b) => b.status === s).length}
            </p>
          </div>
        ))}
      </div>
      <ReadingStats books={books} />
      {error && (
        <p
          role="alert"
          className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <p
        role="status"
        aria-live="polite"
        className={cn('text-sm text-primary', notice && 'mb-4')}
      >
        {notice}
      </p>
      <section aria-label="Sök och filtrera böcker" className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 size-5 text-muted-foreground" />
            <Input
              aria-label="Sök efter titel eller författare"
              type="search"
              placeholder="Sök titel eller författare…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            label="Sortera böcker"
            value={sort}
            onValueChange={(value) => setSort(value as Sort)}
            className="sm:w-52"
            options={[
              { value: 'newest', label: 'Senast tillagda' },
              { value: 'title', label: 'Titel A–Ö' },
              { value: 'rating', label: 'Högst betyg' },
              { value: 'finished', label: 'Senast lästa' },
            ]}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Select
            label="Filtrera på stjärnbetyg"
            value={rating}
            onValueChange={(value) =>
              setRating(value as NonNullable<BookFilters['rating']>)
            }
            options={[
              { value: 'all', label: 'Alla betyg' },
              ...[5, 4, 3, 2, 1].map((n) => ({
                value: String(n),
                label: `${n} ${n === 1 ? 'stjärna' : 'stjärnor'}`,
              })),
              { value: 'unrated', label: 'Utan betyg' },
            ]}
          />
          <Select
            label="Filtrera på anteckningar"
            value={notes}
            onValueChange={(value) =>
              setNotes(value as NonNullable<BookFilters['notes']>)
            }
            options={[
              { value: 'all', label: 'Alla anteckningar' },
              { value: 'with', label: 'Med anteckning' },
              { value: 'without', label: 'Utan anteckning' },
            ]}
          />
          <Select
            label="Filtrera på läsår"
            value={year}
            onValueChange={setYear}
            options={[
              { value: 'all', label: 'Alla läsår' },
              ...readingYears(books).map((value) => ({
                value,
                label: `Lästa ${value}`,
              })),
            ]}
          />
        </div>
        {filtered && visible.length > 0 && (
          <Button variant="ghost" onClick={resetFilters}>
            Rensa sökning och filter
          </Button>
        )}
        <div className="flex flex-wrap gap-2 border-b pb-5">
          {filters.map(([value, label]) => (
            <Button
              key={value}
              variant={status === value ? 'default' : 'ghost'}
              aria-label={`${label} ${value === 'all' ? books.length : books.filter((book) => book.status === value).length}`}
              aria-pressed={status === value}
              onClick={() => setStatus(value)}
            >
              {label}
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs',
                  status === value ? 'bg-white/15' : 'bg-muted',
                )}
              >
                {value === 'all'
                  ? books.length
                  : books.filter((book) => book.status === value).length}
              </span>
            </Button>
          ))}
        </div>
      </section>
      {visible.length > 0 ? (
        <>
          <p className="mb-5 mt-6 text-sm text-muted-foreground">
            {visible.length} {visible.length === 1 ? 'bok' : 'böcker'}
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
            {visible.map((book) => (
              <BookCard
                key={`${book.id}-${book.updatedAt}`}
                book={book}
                onOpen={() => {
                  onOpen(book);
                }}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="my-8 flex flex-col items-center rounded-lg border border-dashed bg-card/50 px-6 py-14 text-center">
          <span className="mb-5 flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Library className="size-8" />
          </span>
          <h2 className="font-serif text-2xl">
            {blocked
              ? 'Biblioteket kunde inte öppnas'
              : books.length
                ? 'Inga böcker matchar din sökning'
                : 'Här börjar ditt bibliotek'}
          </h2>
          <p className="mb-6 mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {blocked
              ? 'Ladda om sidan när du har kontrollerat webbläsarens lagring.'
              : books.length
                ? 'Prova en annan sökning eller ändra dina filter.'
                : 'Lägg till en bok du har läst, läser just nu eller längtar efter att börja med.'}
          </p>
          {!blocked &&
            (books.length ? (
              <Button variant="outline" onClick={resetFilters}>
                Rensa sökning och filter
              </Button>
            ) : (
              <p className="text-sm text-primary">
                Välj Lägg till bok i menyn längst ner.
              </p>
            ))}
        </div>
      )}
      <footer className="mt-12 flex items-start gap-2 border-t pt-5 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        <p>
          {cloud
            ? 'Dina böcker sparas privat på ditt konto. Gästbiblioteket finns kvar på enheten.'
            : 'Ditt gästbibliotek sparas i den här webbläsaren. Rensar du webbläsarens data försvinner gästböckerna. Logga in via knappen högst upp för molnlagring.'}
        </p>
      </footer>
    </>
  );
}
