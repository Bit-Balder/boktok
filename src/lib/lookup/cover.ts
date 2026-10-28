import { normalize, validCover, type BookInput } from '../books';
import { canonicalIsbn } from '../isbn';
import { providers, type BookResult, type LookupProvider } from './index';

function coverCandidates(book: BookInput, results: BookResult[]) {
  const images = results.filter(
    (result) => result.book.coverUrl && validCover(result.book.coverUrl),
  );
  const isbn = canonicalIsbn(book.isbn);
  const exact =
    isbn &&
    images.filter((result) =>
      [result.book.isbn, ...(result.isbns || [])].some(
        (value) => canonicalIsbn(value) === isbn,
      ),
    );

  const title = normalize(book.title);
  const titles = images.filter(
    (result) =>
      normalize(result.book.title) === title ||
      normalize(result.book.title.split(':')[0]) ===
        normalize(book.title.split(':')[0]),
  );
  return [
    ...new Set(
      [...(exact || []), ...titles].map((result) => result.book.coverUrl!),
    ),
  ];
}

export function chooseCover(book: BookInput, results: BookResult[]) {
  return coverCandidates(book, results)[0];
}

// Image loading also works across origins without requiring CORS permission.
// Browsers do not expose HTTP status here: 403, 404 and broken images all fail.
export function canLoadCover(
  url: string,
  signal: AbortSignal,
): Promise<boolean> {
  if (!validCover(url) || signal.aborted) return Promise.resolve(false);
  return new Promise((resolve) => {
    const image = new Image();
    const finish = (loaded: boolean) => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      image.onload = null;
      image.onerror = null;
      if (!loaded) image.removeAttribute('src');
      resolve(loaded);
    };
    const abort = () => finish(false);
    const timer = setTimeout(abort, 5000);
    signal.addEventListener('abort', abort, { once: true });
    image.referrerPolicy = 'no-referrer';
    image.onload = () =>
      finish(image.naturalWidth > 0 && image.naturalHeight > 0);
    image.onerror = () => finish(false);
    image.src = url;
  });
}

export async function findCover(
  book: BookInput,
  signal: AbortSignal,
  sources: LookupProvider[] = providers.filter(
    (source) => source.name !== 'Libris',
  ),
) {
  if (signal.aborted) return undefined;
  if (book.coverUrl && (await canLoadCover(book.coverUrl, signal)))
    return book.coverUrl;
  if (!book.title.trim() || signal.aborted) return undefined;
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
      for (const cover of coverCandidates(book, results)) {
        if (request.signal.aborted) break;
        if (await canLoadCover(cover, request.signal)) return cover;
      }
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
