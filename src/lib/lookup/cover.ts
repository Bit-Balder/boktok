import { normalize, validCover, type BookInput } from '../books';
import { canonicalIsbn } from '../isbn';
import { providers, type BookResult, type LookupProvider } from './index';

export function chooseCover(book: BookInput, results: BookResult[]) {
  const images = results.filter(
    (result) => result.book.coverUrl && validCover(result.book.coverUrl),
  );
  const isbn = canonicalIsbn(book.isbn);
  const exact =
    isbn &&
    images.find((result) =>
      [result.book.isbn, ...(result.isbns || [])].some(
        (value) => canonicalIsbn(value) === isbn,
      ),
    );
  if (exact) return exact.book.coverUrl;
  const title = normalize(book.title);
  return images.find(
    (result) =>
      normalize(result.book.title) === title ||
      normalize(result.book.title.split(':')[0]) ===
        normalize(book.title.split(':')[0]),
  )?.book.coverUrl;
}

export async function findCover(
  book: BookInput,
  signal: AbortSignal,
  sources: LookupProvider[] = providers.filter(
    (source) => source.name !== 'Libris',
  ),
) {
  if (book.coverUrl || !book.title.trim() || signal.aborted) return undefined;
  // Search with title and authors as plain text, then rank the returned covers locally.
  const query = [book.title, ...book.authors].join(' ').trim().slice(0, 500);
  for (const source of sources) {
    if (signal.aborted) return undefined;
    const request = new AbortController();
    const abort = () => request.abort();
    signal.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, 8000);
    try {
      const results = await source.search(query, 'all', request.signal);
      if (signal.aborted) return undefined;
      const cover = chooseCover(book, results);
      if (cover) return cover;
    } catch {
      if (signal.aborted) return undefined;
      console.warn(`[Boktok] ${source.name}: COVER_LOOKUP_FAILED`);
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
    }
  }
  return undefined;
}
