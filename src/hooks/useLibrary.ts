import { useState } from 'react';
import type { Book, BookInput } from '../lib/books';
import { validateBook } from '../lib/books';
import { localLibrary } from '../lib/storage';
export function useLibrary() {
  const [initial] = useState(() => {
    try {
      return { books: localLibrary.load(), error: '' };
    } catch {
      return {
        books: [] as Book[],
        error:
          'Biblioteket kunde inte läsas. Dina sparade uppgifter har inte ändrats. Kontrollera webbläsarens lagring och ladda om sidan.',
      };
    }
  });
  const [books, setBooks] = useState(initial.books);
  const [error, setError] = useState(initial.error);
  function commit(change: (current: Book[]) => Book[]) {
    if (initial.error) return false;
    try {
      // Re-read before every write to preserve changes made in another tab.
      const next = change(localLibrary.load());
      localLibrary.save(next);
      setBooks(next);
      setError('');
      return true;
    } catch {
      setError(
        'Kunde inte spara. Webbläsarens lagring kan vara full eller blockerad. Dina ändringar finns kvar i formuläret.',
      );
      return false;
    }
  }
  function save(input: BookInput, id?: string) {
    const validation = validateBook(input);
    if (validation) {
      setError(validation);
      return false;
    }
    const now = new Date().toISOString();
    return commit((current) => {
      if (id && !current.some((book) => book.id === id))
        throw new Error('Boken har tagits bort i en annan flik.');
      return id
        ? current.map((book) =>
            book.id === id ? { ...book, ...input, updatedAt: now } : book,
          )
        : [
            ...current,
            {
              ...input,
              id: crypto.randomUUID(),
              createdAt: now,
              updatedAt: now,
            },
          ];
    });
  }
  return {
    books,
    error,
    blocked: Boolean(initial.error),
    save,
    remove: (id: string) =>
      commit((current) => current.filter((b) => b.id !== id)),
  };
}
