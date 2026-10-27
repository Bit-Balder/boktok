import { useState } from 'react';
import { BookOpen, Library, Plus, Search, ShieldCheck } from 'lucide-react';
import { useLibrary } from './hooks/useLibrary';
import {
  selectBooks,
  statuses,
  type Book,
  type Sort,
  type Status,
} from './lib/books';
import { BookCard } from './components/BookCard';
import { BookForm } from './components/BookForm';
import { BookDetails } from './components/BookDetails';
import { Button } from './components/ui/button';
import { Dialog } from './components/ui/dialog';
import { Input, Select } from './components/ui/field';
import { cn } from './lib/utils';

export default function App() {
  const library = useLibrary();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status | 'all'>('all');
  const [sort, setSort] = useState<Sort>('newest');
  const [form, setForm] = useState<Book | 'new' | null>(null);
  const [selected, setSelected] = useState<Book | null>(null);
  const [notice, setNotice] = useState('');
  const books = selectBooks(library.books, query, status, sort);
  const filters: [Status | 'all', string][] = [
    ['all', 'Alla böcker'],
    ...(Object.entries(statuses) as [Status, string][]),
  ];
  function add() {
    setNotice('');
    setForm('new');
  }
  return (
    <div className="min-h-dvh pb-24 sm:pb-0">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-card focus:p-4"
      >
        Hoppa till innehållet
      </a>
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <a
            href="./"
            aria-label="Boktok, startsida"
            className="flex items-center gap-3"
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-white">
              <BookOpen className="size-6" />
            </span>
            <span className="font-serif text-2xl font-bold tracking-tight">
              boktok<span className="text-primary">.</span>
            </span>
          </a>
          <div className="flex items-center gap-2 rounded-full bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4" />
            Sparas på din enhet
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
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
          <Button
            onClick={add}
            disabled={library.blocked}
            className="hidden sm:inline-flex"
          >
            <Plus />
            Lägg till bok
          </Button>
        </div>
        <div className="mb-8 grid grid-cols-3 gap-3 sm:gap-5">
          {(['want_to_read', 'reading', 'finished'] as Status[]).map((s) => (
            <div key={s} className="rounded-lg border bg-card p-4 sm:p-5">
              <p className="text-xs text-muted-foreground sm:text-sm">
                {statuses[s]}
              </p>
              <p className="mt-2 font-serif text-3xl">
                {library.books.filter((b) => b.status === s).length}
              </p>
            </div>
          ))}
        </div>
        {library.error && (
          <p
            role="alert"
            className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          >
            {library.error}
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
              aria-label="Sortera böcker"
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="sm:w-52"
            >
              <option value="newest">Senast tillagda</option>
              <option value="title">Titel A–Ö</option>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2 border-b pb-5">
            {filters.map(([value, label]) => (
              <Button
                key={value}
                variant={status === value ? 'default' : 'ghost'}
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
                    ? library.books.length
                    : library.books.filter((b) => b.status === value).length}
                </span>
              </Button>
            ))}
          </div>
        </section>
        {books.length > 0 ? (
          <>
            <p className="mb-5 mt-6 text-sm text-muted-foreground">
              {books.length} {books.length === 1 ? 'bok' : 'böcker'}
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
              {books.map((book) => (
                <BookCard
                  key={`${book.id}-${book.updatedAt}`}
                  book={book}
                  onOpen={() => {
                    setSelected(book);
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
              {library.blocked
                ? 'Biblioteket kunde inte öppnas'
                : library.books.length
                  ? 'Inga böcker matchar din sökning'
                  : 'Här börjar ditt bibliotek'}
            </h2>
            <p className="mb-6 mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {library.blocked
                ? 'Ladda om sidan när du har kontrollerat webbläsarens lagring.'
                : library.books.length
                  ? 'Prova en annan titel, författare eller lässtatus.'
                  : 'Lägg till en bok du har läst, läser just nu eller längtar efter att börja med.'}
            </p>
            {!library.blocked &&
              (library.books.length ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery('');
                    setStatus('all');
                  }}
                >
                  Rensa sökning och filter
                </Button>
              ) : (
                <Button onClick={add}>
                  <Plus />
                  Lägg till din första bok
                </Button>
              ))}
          </div>
        )}
        <footer className="mt-12 flex items-start gap-2 border-t pt-5 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          <p>
            Ditt bibliotek sparas i den här webbläsaren. Rensar du webbläsarens
            data försvinner böckerna. Konton och molnlagring kommer senare.
          </p>
        </footer>
      </main>
      <nav
        aria-label="Mobilnavigering"
        className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between border-t bg-card px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-primary">
          <Library className="size-5" />
          Mitt bibliotek
        </span>
        <Button onClick={add} disabled={library.blocked}>
          <Plus />
          Lägg till bok
        </Button>
      </nav>
      <Dialog
        open={form !== null}
        onOpenChange={(open) => {
          if (!open) setForm(null);
        }}
        title={form === 'new' ? 'Lägg till bok' : 'Redigera bok'}
        description="Titel är obligatorisk. Fyll i resten när du vill."
      >
        {form && (
          <BookForm
            key={form === 'new' ? 'new' : form.id}
            book={form === 'new' ? undefined : form}
            error={library.error}
            blocked={library.blocked}
            onCancel={() => setForm(null)}
            onSave={(input) => {
              if (library.save(input, form === 'new' ? undefined : form.id)) {
                setNotice(
                  form === 'new'
                    ? 'Boken har sparats.'
                    : 'Dina ändringar har sparats.',
                );
                setForm(null);
              }
            }}
          />
        )}
      </Dialog>
      {selected && (
        <BookDetails
          selected={selected}
          setSelected={setSelected}
          onEdit={setForm}
          error={library.error}
          onRemove={(id) => {
            const saved = library.remove(id);
            if (saved) setNotice('Boken har tagits bort.');
            return saved;
          }}
        />
      )}
    </div>
  );
}
