import { useEffect, useRef, useState } from 'react';
import { BookOpen, ShieldCheck } from 'lucide-react';
import { useLibrary } from './hooks/useLibrary';
import type { Book, BookInput } from './lib/books';
import type { Duplicate } from './lib/duplicates';
import type { BookResult } from './lib/lookup';
import { LibraryView } from './components/LibraryView';
import { BookForm } from './components/BookForm';
import { BookLookup } from './components/BookLookup';
import { BookDetails } from './components/BookDetails';
import { BottomNav } from './components/BottomNav';
import { Settings } from './components/Settings';
import { DuplicateDialog } from './components/DuplicateDialog';
import { Dialog } from './components/ui/dialog';
import { Button } from './components/ui/button';
interface Editor {
  id?: string;
  draft: BookInput;
  initial: BookInput;
}
interface Confirmation {
  title: string;
  description: string;
  label: string;
  run: () => void;
}
const emptyBook = (): BookInput => ({
  title: '',
  authors: [],
  status: 'want_to_read',
});
export default function App({
  reload = () => window.location.reload(),
}: {
  reload?: () => void;
}) {
  const library = useLibrary();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [selected, setSelected] = useState<Book | null>(null);
  const [settings, setSettings] = useState(false);
  const [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [duplicates, setDuplicates] = useState<{
    matches: Duplicate[];
    input: BookInput;
  } | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const skipUnload = useRef(false);
  const dirty =
    editor !== null &&
    JSON.stringify(editor.draft) !== JSON.stringify(editor.initial);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (skipUnload.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const editing = editor !== null;
  useEffect(() => {
    titleRef.current?.focus();
  }, [editing]);
  function guard(run: () => void) {
    if (dirty)
      setConfirmation({
        title: 'Lämna osparade ändringar?',
        description:
          'Ändringarna i formuläret har inte sparats. Vill du lämna dem?',
        label: 'Lämna ändringarna',
        run,
      });
    else run();
  }
  function add() {
    if (editor && !editor.id) return;
    guard(() => {
      const draft = emptyBook();
      setNotice('');
      setEditor({ draft, initial: draft });
      setSelected(null);
    });
  }
  function edit(book: Book) {
    guard(() => {
      const { id, createdAt: _, updatedAt: __, ...draft } = book;
      void _;
      void __;
      setEditor({ id, draft, initial: draft });
      setSelected(null);
    });
  }
  function closeEditor() {
    guard(() => setEditor(null));
  }
  function save(input: BookInput, allowDuplicate = false) {
    const result = library.save(input, editor?.id, allowDuplicate);
    if (result.status === 'duplicate') {
      setDuplicates({ matches: result.matches, input });
      return;
    }
    if (result.status === 'saved') {
      setNotice(
        editor?.id ? 'Dina ändringar har sparats.' : 'Boken har sparats.',
      );
      setEditor(null);
      setDuplicates(null);
    }
    if (result.status === 'error') setDuplicates(null);
  }
  function choose(result: BookResult) {
    const apply = () =>
      setEditor((current) =>
        current
          ? {
              ...current,
              draft: {
                ...current.draft,
                title: result.book.title,
                authors: result.book.authors,
                isbn: result.book.isbn,
                coverUrl: result.book.coverUrl,
                description: result.book.description,
              },
            }
          : null,
      );
    if (
      editor &&
      (editor.draft.title ||
        editor.draft.authors.some(Boolean) ||
        editor.draft.isbn ||
        editor.draft.coverUrl ||
        editor.draft.description)
    )
      setConfirmation({
        title: 'Ersätt bokuppgifterna?',
        description:
          'Titeln, författaren, ISBN, omslaget och beskrivningen ersätts. Lässtatus, datum, betyg och anteckningar behålls.',
        label: 'Använd bokuppgifterna',
        run: apply,
      });
    else apply();
  }
  function refresh() {
    if (dirty)
      setConfirmation({
        title: 'Ladda om med osparade ändringar?',
        description:
          'Dina sparade böcker finns kvar. Osparade ändringar i formuläret försvinner.',
        label: 'Ladda om ändå',
        run: () => {
          setEditor(null);
          setSettings(false);
          skipUnload.current = true;
          reload();
        },
      });
    else reload();
  }
  return (
    <div className="min-h-dvh pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-card focus:p-4"
      >
        Hoppa till innehållet
      </a>
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <button
            type="button"
            onClick={closeEditor}
            aria-label="Boktok, startsida"
            className="flex items-center gap-3"
          >
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookOpen className="size-6" />
            </span>
            <span className="font-serif text-2xl font-bold tracking-tight">
              boktok<span className="text-primary">.</span>
            </span>
          </button>
          <div className="flex items-center gap-2 rounded-full bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4" />
            Sparas på din enhet
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        {editor ? (
          <section className="mx-auto max-w-2xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
              Ditt nästa kapitel
            </p>
            <h1 ref={titleRef} tabIndex={-1} className="font-serif text-4xl">
              {editor.id ? 'Redigera bok' : 'Lägg till bok'}
            </h1>
            <p className="mt-3 mb-7 text-muted-foreground">
              Titel är obligatorisk. Fyll i resten när du vill.
            </p>
            <BookLookup onChoose={choose} />
            <div className="rounded-lg border bg-card p-5 sm:p-7">
              <BookForm
                key={editor.id || 'new'}
                editing={Boolean(editor.id)}
                draft={editor.draft}
                onChange={(draft) => setEditor({ ...editor, draft })}
                error={library.error}
                blocked={library.blocked}
                onCancel={closeEditor}
                onSave={(input) => save(input)}
              />
            </div>
          </section>
        ) : (
          <LibraryView
            books={library.books}
            blocked={library.blocked}
            error={library.error}
            notice={notice}
            onAdd={add}
            onOpen={setSelected}
          />
        )}
      </main>
      <BottomNav
        editing={editing}
        settings={settings}
        blocked={library.blocked}
        onLibrary={closeEditor}
        onAdd={add}
        onSettings={() => setSettings(true)}
      />
      <Settings
        open={settings}
        onOpenChange={setSettings}
        onRefresh={refresh}
      />
      {duplicates && (
        <DuplicateDialog
          matches={duplicates.matches}
          onCancel={() => setDuplicates(null)}
          onView={(book) => {
            setDuplicates(null);
            setSelected(book);
          }}
          onConfirm={() => save(duplicates.input, true)}
        />
      )}
      {selected && (
        <BookDetails
          selected={selected}
          setSelected={setSelected}
          onEdit={edit}
          error={library.error}
          onRemove={(id) => {
            const saved = library.remove(id);
            if (saved) setNotice('Boken har tagits bort.');
            return saved;
          }}
        />
      )}
      <Dialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
        title={confirmation?.title || 'Bekräfta'}
        description={confirmation?.description || ''}
      >
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmation(null)}>
            Avbryt
          </Button>
          <Button
            onClick={() => {
              const action = confirmation?.run;
              setConfirmation(null);
              action?.();
            }}
          >
            {confirmation?.label}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
