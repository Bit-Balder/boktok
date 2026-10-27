import {
  collection,
  doc,
  getDocsFromServer,
  getDocFromServer,
  onSnapshot,
  runTransaction,
  type Firestore,
} from 'firebase/firestore';
import type { Auth } from 'firebase/auth';
import { isBook, validateBook, type Book, type BookInput } from '../books';
import { findDuplicates, type Duplicate } from '../duplicates';
import { applyBookChange, type BookChange } from '../bookChanges';
export type SaveResult =
  | { status: 'saved' }
  | { status: 'error' }
  | { status: 'duplicate'; matches: Duplicate[] };
export interface ImportItem {
  book: Book;
  matches: Duplicate[];
}
export interface CloudBackend {
  watch(onBooks: (books: Book[]) => void, onError: () => void): () => void;
  save(
    input: BookInput,
    id?: string,
    allowDuplicate?: boolean,
  ): Promise<SaveResult>;
  update(id: string, change: BookChange): Promise<void>;
  remove(id: string): Promise<void>;
  importPlan(local: Book[]): Promise<ImportItem[]>;
  importBook(
    book: Book,
    decision: 'add' | 'skip',
    force?: boolean,
  ): Promise<SaveResult>;
}
function clean<T extends object>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  );
}
function readBook(id: string, data: unknown): Book {
  if (!isBook(data) || data.id !== id)
    throw new Error('Biblioteket innehåller ogiltiga uppgifter.');
  return data;
}
function sourceId(id: string) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id))
    throw new Error('Ogiltigt lokalt bok-ID.');
  return id;
}
export function createCloudBackend(
  db: Firestore,
  auth: Pick<Auth, 'currentUser'>,
  uid: string,
): CloudBackend {
  function ensureUser() {
    if (auth.currentUser?.uid !== uid) throw new Error('Kontot har ändrats.');
  }
  const books = collection(db, 'users', uid, 'books');
  const imports = collection(db, 'users', uid, 'imports');
  async function list() {
    ensureUser();
    const snap = await getDocsFromServer(books);
    ensureUser();
    return snap.docs.map((d) => readBook(d.id, d.data()));
  }
  return {
    watch(onBooks, onError) {
      ensureUser();
      return onSnapshot(
        books,
        { includeMetadataChanges: true },
        (snap) => {
          try {
            ensureUser();
            if (snap.metadata.fromCache || snap.metadata.hasPendingWrites)
              return;
            onBooks(snap.docs.map((d) => readBook(d.id, d.data())));
          } catch {
            onError();
          }
        },
        onError,
      );
    },
    async save(input, id, allowDuplicate = false) {
      const invalid = validateBook(input);
      if (invalid) throw new Error(invalid);
      const current = await list();
      const matches = findDuplicates(input, current, id);
      if (matches.length && !allowDuplicate)
        return { status: 'duplicate', matches };
      const target = doc(books, id || crypto.randomUUID());
      await runTransaction(db, async (transaction) => {
        ensureUser();
        const existing = await transaction.get(target);
        ensureUser();
        if (id && !existing.exists()) throw new Error('Boken har tagits bort.');
        if (!id && existing.exists()) throw new Error('Boken finns redan.');
        const now = new Date().toISOString();
        const old = existing.exists()
          ? readBook(existing.id, existing.data())
          : undefined;
        const next = {
          ...input,
          id: target.id,
          createdAt: old?.createdAt || now,
          updatedAt: now,
        };
        transaction.set(target, clean(next));
      });
      ensureUser();
      return { status: 'saved' };
    },
    async update(id, change) {
      ensureUser();
      const target = doc(books, id);
      await runTransaction(db, async (tx) => {
        ensureUser();
        const current = await tx.get(target);
        if (!current.exists()) throw new Error('Boken har tagits bort.');
        const old = readBook(current.id, current.data());
        const next = applyBookChange([old], id, change)[0];
        ensureUser();
        tx.set(target, clean(next));
      });
      ensureUser();
    },
    async remove(id) {
      ensureUser();
      const target = doc(books, id);
      await runTransaction(db, async (tx) => {
        ensureUser();
        await tx.get(target);
        ensureUser();
        tx.delete(target);
      });
      ensureUser();
    },
    async importPlan(local) {
      ensureUser();
      const [remote, receipts] = await Promise.all([
        list(),
        getDocsFromServer(imports),
      ]);
      ensureUser();
      const done = new Set(receipts.docs.map((d) => d.id));
      return local
        .filter((book) => !done.has(sourceId(book.id)))
        .map((book) => ({ book, matches: findDuplicates(book, remote) }));
    },
    async importBook(book, decision, force = false) {
      ensureUser();
      if (!isBook(book)) throw new Error('Ogiltig bok.');
      const id = sourceId(book.id);
      const receipt = doc(imports, id);
      const target = doc(books, `import-${id}`);
      const previous = await getDocFromServer(receipt);
      ensureUser();
      if (previous.exists()) return { status: 'saved' };
      if (decision === 'add' && !force) {
        const current = await list();
        const matches = findDuplicates(book, current);
        if (matches.length) return { status: 'duplicate', matches };
      }
      await runTransaction(db, async (tx) => {
        ensureUser();
        const [saved, existing] = await Promise.all([
          tx.get(receipt),
          tx.get(target),
        ]);
        ensureUser();
        if (saved.exists()) return;
        if (decision === 'add') {
          if (existing.exists())
            throw new Error('Importen kan inte skriva över en befintlig bok.');
          tx.set(target, clean({ ...book, id: target.id }));
        }
        tx.set(receipt, {
          sourceId: id,
          bookId: decision === 'add' ? target.id : '',
          status: decision === 'add' ? 'imported' : 'skipped',
          createdAt: new Date().toISOString(),
        });
      });
      ensureUser();
      return { status: 'saved' };
    },
  };
}
