import { isBook, type Book } from './books';
export const STORAGE_KEY = 'boktok.library.v1';
export interface LibraryStorage {
  load(): Book[];
  save(books: Book[]): void;
}
export function createLocalStorage(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
): LibraryStorage {
  return {
    load() {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw === null) return [];
      const data: unknown = JSON.parse(raw);
      if (
        !data ||
        typeof data !== 'object' ||
        !('version' in data) ||
        data.version !== 1 ||
        !('books' in data) ||
        !Array.isArray(data.books) ||
        !data.books.every(isBook) ||
        new Set(data.books.map((b) => b.id)).size !== data.books.length
      )
        throw new Error('Ogiltig biblioteksfil');
      return data.books;
    },
    save(books) {
      storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, books }));
    },
  };
}
export const localLibrary: LibraryStorage = {
  load: () => createLocalStorage(window.localStorage).load(),
  save: (books) => createLocalStorage(window.localStorage).save(books),
};
