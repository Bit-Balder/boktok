import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { Search, LoaderCircle } from 'lucide-react';
import { searchBooks, type BookResult, type SearchMode } from '../lib/lookup';
import { Input } from './ui/field';
import { Select } from './ui/select';
import { Button } from './ui/button';
import BookScanner from './BookScanner';
import type { Book } from '../lib/books';
import { findDuplicates } from '../lib/duplicates';
import { canonicalIsbn } from '../lib/isbn';
import { BookCover } from './BookCover';
export function BookLookup({
  onChoose,
  books = [],
}: {
  onChoose: (result: BookResult) => void;
  books?: Book[];
}) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('all');
  const [results, setResults] = useState<BookResult[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  function reset() {
    controller.current?.abort();
    setLoading(false);
    setSearched(false);
    setResults([]);
    setUnavailable(false);
    setError('');
  }
  const search = useCallback(async (term: string, searchMode: SearchMode) => {
    setQuery(term);
    setMode(searchMode);
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setLoading(true);
    setResults([]);
    setError('');
    setUnavailable(false);
    setSearched(false);
    try {
      const response = await searchBooks(term, searchMode, request.signal);
      if (!request.signal.aborted) {
        setResults(response.results);
        setUnavailable(response.unavailable);
        setSearched(true);
      }
    } catch (error) {
      if (!request.signal.aborted)
        setError(
          error instanceof Error &&
            error.message === 'Ange ett giltigt ISBN-10 eller ISBN-13.'
            ? error.message
            : 'Sökningen kunde inte slutföras. Försök igen.',
        );
    } finally {
      if (!request.signal.aborted) setLoading(false);
    }
  }, []);
  function submit(e: FormEvent) {
    e.preventDefault();
    void search(query, mode);
  }
  const scannedMatch =
    mode === 'isbn' &&
    canonicalIsbn(query) &&
    books.some((book) => canonicalIsbn(book.isbn) === canonicalIsbn(query));
  return (
    <section
      aria-label="Hitta bokuppgifter"
      className="mb-7 rounded-lg border bg-muted/30 p-4 sm:p-5"
    >
      <h2 className="font-serif text-xl">Hitta din bok</h2>
      <p className="mt-2 mb-4 text-sm text-muted-foreground">
        Hämta bokuppgifter eller fyll i formuläret själv.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <Select
          label="Sök med"
          value={mode}
          onValueChange={(value) => {
            reset();
            setMode(value as SearchMode);
          }}
          options={[
            { value: 'all', label: 'Titel eller författare' },
            { value: 'isbn', label: 'ISBN' },
            { value: 'title', label: 'Titel' },
            { value: 'author', label: 'Författare' },
          ]}
        />
        <div className="flex gap-2">
          <Input
            aria-label="Sök i bokdatabaser"
            value={query}
            required
            maxLength={250}
            onChange={(e) => {
              reset();
              setQuery(e.target.value);
            }}
            placeholder={
              mode === 'isbn' ? 'ISBN-10 eller ISBN-13' : 'Sök efter en bok…'
            }
          />
          <Button type="submit" disabled={loading || !query.trim()}>
            {loading ? <LoaderCircle className="animate-spin" /> : <Search />}
            Sök
          </Button>
        </div>
      </form>
      <BookScanner onSearch={search} />
      {scannedMatch && (
        <p role="status" className="mt-3 text-sm text-primary">
          En bok med detta ISBN finns redan i ditt bibliotek. Du kan granska
          uppgifterna och välja en annan utgåva.
        </p>
      )}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Sökningen skickas till Google Books och vid behov Open Library.
        Anteckningar och lässtatus stannar här.
      </p>
      <div aria-live="polite" className="mt-3 text-sm">
        {loading && <p>Söker efter böcker…</p>}
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        {searched &&
          !results.length &&
          (unavailable ? (
            <p role="alert">
              Sökningen kunde inte slutföras. Försök igen eller fyll i
              uppgifterna manuellt.
            </p>
          ) : (
            <p>
              Inga böcker hittades. Prova en annan sökning eller fyll i
              uppgifterna manuellt.
            </p>
          ))}
        {results.length > 0 && (
          <p className="mb-3 text-muted-foreground">
            {results.length} träffar. Välj rätt bok och granska uppgifterna.
          </p>
        )}
      </div>
      <ul className="max-h-96 space-y-2 overflow-y-auto">
        {results.map((result) => (
          <li key={result.key}>
            <button
              type="button"
              onClick={() => onChoose(result)}
              className="flex w-full items-start gap-3 rounded-md border bg-card p-3 text-left hover:bg-muted"
            >
              <BookCover
                title={result.book.title}
                url={result.book.coverUrl}
                compact
              />
              <div className="min-w-0">
                <span className="block font-medium">{result.book.title}</span>
                <span className="block text-sm text-muted-foreground">
                  {result.book.authors.join(', ') || 'Författare saknas'}
                </span>
                {findDuplicates(result.book, books).length > 0 && (
                  <span className="mt-1 block text-xs text-primary">
                    Liknande bok finns i ditt bibliotek
                  </span>
                )}
                <span className="mt-1 block text-xs text-muted-foreground">
                  {result.source}
                  {result.book.isbn
                    ? ` · ISBN ${result.book.isbn}`
                    : ' · Utgåva behöver kontrolleras'}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
