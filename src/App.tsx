import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useLibrary } from './hooks/useLibrary';
import { useAccount, type AccountController } from './hooks/useAccount';
import type { LibraryController } from './lib/library';
import { AccountControl } from './components/AccountControl';
const CloudSession = lazy(() => import('./components/CloudSession'));
import { useKeyboardViewport } from './hooks/useKeyboardViewport';
import type { Book, BookInput } from './lib/books';
import type { Duplicate } from './lib/duplicates';
import type { BookResult } from './lib/lookup';
import { findCover } from './lib/lookup/cover';
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
  coverBook?: BookInput;
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
  const account = useAccount();
  return account.user ? (
    <Suspense
      fallback={
        <p role="status" className="p-8 text-center">
          Öppnar ditt molnbibliotek…
        </p>
      }
    >
      <CloudSession key={account.user.uid} account={account} reload={reload} />
    </Suspense>
  ) : (
    <GuestSession key="guest" account={account} reload={reload} />
  );
}
function GuestSession({
  account,
  reload,
}: {
  account: AccountController;
  reload: () => void;
}) {
  const local = useLibrary();
  return (
    <Workspace
      account={account}
      reload={reload}
      library={{
        ...local,
        pending: false,
        loading: !account.ready,
        blocked: local.blocked || !account.ready,
        imports: null,
      }}
    />
  );
}
export function Workspace({
  account,
  library,
  reload,
}: {
  account: AccountController;
  library: LibraryController;
  reload: () => void;
}) {
  useKeyboardViewport();
  const [notesDirty, setNotesDirty] = useState(false);
  const [scrollRequest, setScrollRequest] = useState(0);
  const formStartRef = useRef<HTMLDivElement>(null);
  const saving = useRef(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [coverFinished, setCoverFinished] = useState<BookInput>();
  const coverBook = editor?.coverBook;
  const coverLoading = Boolean(coverBook && coverFinished !== coverBook);
  useEffect(() => {
    if (!coverBook) return;
    const controller = new AbortController();
    void findCover(coverBook, controller.signal).then((coverUrl) => {
      if (controller.signal.aborted) return;
      if (coverUrl)
        setEditor((current) =>
          current?.coverBook === coverBook && !current.draft.coverUrl
            ? { ...current, draft: { ...current.draft, coverUrl } }
            : current,
        );
      setCoverFinished(coverBook);
    });
    return () => controller.abort();
  }, [coverBook]);
  const [selected, setSelected] = useState<Book | null>(null);
  const [settings, setSettings] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [duplicates, setDuplicates] = useState<{
    matches: Duplicate[];
    input: BookInput;
  } | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const skipUnload = useRef(false);
  const editorDirty =
    editor !== null &&
    JSON.stringify(editor.draft) !== JSON.stringify(editor.initial);
  const editorActionsVisible = Boolean(editor?.id) || editorDirty;
  const dirty = editorDirty || notesDirty;
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
    if (editorDirty)
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
      saving.current = false;
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
      saving.current = false;
      setEditor({ id, draft, initial: draft });
      setSelected(null);
    });
  }
  function closeEditor() {
    if (library.pending) return;
    guard(() => setEditor(null));
  }
  async function save(input: BookInput, allowDuplicate = false) {
    if (saving.current || coverLoading) return;
    saving.current = true;
    const result = await library.save(input, editor?.id, allowDuplicate);
    if (result.status !== 'saved') saving.current = false;
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
    const apply = () => {
      setCoverFinished(undefined);
      setScrollRequest((request) => request + 1);
      setEditor((current) =>
        current
          ? {
              ...current,
              coverBook: result.book.coverUrl ? undefined : result.book,
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
    };
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
  useEffect(() => {
    if (!scrollRequest) return;
    const frame = requestAnimationFrame(() => {
      const input = document.getElementById('title');
      input?.focus({ preventScroll: true });
      formStartRef.current?.scrollIntoView({
        behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)')
          .matches
          ? 'auto'
          : 'smooth',
        block: 'start',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [scrollRequest]);
  function refresh() {
    if (library.pending) return;
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
  function runAccountAction(run: () => void) {
    if (library.pending) return;
    if (dirty)
      setConfirmation({
        title: 'Lämna osparade ändringar?',
        description:
          'Spara dina ändringar innan du byter konto, eller lämna dem.',
        label: 'Lämna ändringarna',
        run,
      });
    else run();
  }
  return (
    <div className="app-shell min-h-dvh" data-editing={editorActionsVisible}>
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
          <AccountControl
            account={account}
            library={library}
            open={accountOpen}
            onOpenChange={setAccountOpen}
            runAction={runAccountAction}
          />
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        {library.loading && (
          <p
            role="status"
            className="mb-5 rounded-lg border bg-card p-4 text-sm"
          >
            {account.user ? 'Hämtar ditt molnbibliotek…' : 'Hämtar ditt konto…'}
          </p>
        )}
        {library.pending && (
          <p role="status" className="mb-4 text-sm text-primary">
            Sparar ändringen…
          </p>
        )}
        {library.imports && library.imports.items.length > 0 && (
          <div className="mb-6 rounded-lg border bg-card p-4">
            <p className="mb-3 text-sm">
              Du har lokala böcker som kan importeras till ditt konto.
            </p>
            <Button variant="outline" onClick={() => setAccountOpen(true)}>
              Granska lokala böcker
            </Button>
          </div>
        )}
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
            {!editor.id && (
              <BookLookup onChoose={choose} books={library.books} />
            )}
            <div
              ref={formStartRef}
              className="scroll-mt-6 rounded-lg border bg-card p-5 sm:p-7"
            >
              {coverLoading && (
                <p role="status" className="mb-4 text-sm text-muted-foreground">
                  Hämtar omslag… Du kan fortsätta fylla i bokuppgifterna.
                </p>
              )}
              <BookForm
                key={editor.id || 'new'}
                editing={Boolean(editor.id)}
                actionsVisible={editorActionsVisible}
                draft={editor.draft}
                onChange={(draft) =>
                  setEditor({
                    ...editor,
                    draft,
                    coverBook:
                      draft.coverUrl !== editor.draft.coverUrl ||
                      draft.title !== editor.draft.title ||
                      draft.isbn !== editor.draft.isbn ||
                      JSON.stringify(draft.authors) !==
                        JSON.stringify(editor.draft.authors)
                        ? undefined
                        : editor.coverBook,
                  })
                }
                error={library.error}
                blocked={library.blocked || library.pending || coverLoading}
                onCancel={closeEditor}
                onSave={(input) => {
                  void save(input);
                }}
              />
            </div>
          </section>
        ) : (
          <LibraryView
            books={library.books}
            blocked={library.blocked || library.pending}
            error={selected ? '' : library.error}
            notice={notice}
            cloud={Boolean(account.user)}
            onOpen={setSelected}
          />
        )}
      </main>
      <BottomNav
        editing={editing}
        settings={settings}
        blocked={library.blocked || library.pending}
        onLibrary={closeEditor}
        onAdd={add}
        onSettings={() => setSettings(true)}
      />
      <Settings
        open={settings}
        onOpenChange={setSettings}
        onRefresh={refresh}
        busy={library.pending}
        cloud={Boolean(account.user)}
      />
      {duplicates && (
        <DuplicateDialog
          matches={duplicates.matches}
          onCancel={() => setDuplicates(null)}
          onView={(book) => {
            setDuplicates(null);
            setSelected(book);
          }}
          onConfirm={() => {
            void save(duplicates.input, true);
          }}
        />
      )}
      {selected && (
        <BookDetails
          key={selected.id}
          selected={
            library.books.find((book) => book.id === selected.id) || selected
          }
          setSelected={setSelected}
          onEdit={edit}
          error={library.error}
          onUpdate={library.update}
          busy={library.pending}
          onDirtyChange={setNotesDirty}
          onRemove={async (id) => {
            const saved = await library.remove(id);
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
