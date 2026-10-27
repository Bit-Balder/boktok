import type { BookInput } from '../books';
import { canonicalIsbn } from '../isbn';
export type SearchMode = 'all' | 'isbn' | 'title' | 'author';
export interface BookResult {
  key: string;
  source: string;
  book: BookInput;
}
export interface LookupProvider {
  name: string;
  search(
    query: string,
    mode: SearchMode,
    signal: AbortSignal,
  ): Promise<BookResult[]>;
}
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : [];
const string = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';
function cover(value: unknown) {
  try {
    const url = new URL(string(value));
    if (!['http:', 'https:'].includes(url.protocol)) return undefined;
    url.protocol = 'https:';
    return url.href;
  } catch {
    return undefined;
  }
}
async function get(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? 'För många sökningar. Försök igen om en stund.'
        : 'Boktjänsten svarade inte.',
    );
  return response.json();
}
export function normalizeGoogle(payload: unknown): BookResult[] {
  const data = record(payload);
  if (!Array.isArray(data.items)) return [];
  return data.items.flatMap((item): BookResult[] => {
    const raw = record(item);
    const info = record(raw.volumeInfo);
    const title = string(info.title);
    if (!title) return [];
    const ids = Array.isArray(info.industryIdentifiers)
      ? info.industryIdentifiers
          .map((id) => canonicalIsbn(string(record(id).identifier)))
          .filter(Boolean)
      : [];
    return [
      {
        key: `google:${string(raw.id) || title}`,
        source: 'Google Books',
        book: {
          title,
          authors: strings(info.authors),
          isbn: ids[0],
          coverUrl: cover(record(info.imageLinks).thumbnail),
          description: string(info.description) || undefined,
          status: 'want_to_read',
        },
      },
    ];
  });
}
export function normalizeOpenLibrary(
  payload: unknown,
  searchedIsbn?: string,
): BookResult[] {
  const data = record(payload);
  if (!Array.isArray(data.docs)) return [];
  return data.docs.flatMap((item): BookResult[] => {
    const info = record(item);
    const title = string(info.title);
    if (!title) return [];
    // Search returns works containing multiple editions. Never select an arbitrary edition's ISBN.
    const matched =
      searchedIsbn &&
      strings(info.isbn).some((i) => canonicalIsbn(i) === searchedIsbn)
        ? searchedIsbn
        : undefined;
    return [
      {
        key: `openlibrary:${string(info.key) || title}`,
        source: 'Open Library',
        book: {
          title,
          authors: strings(info.author_name),
          isbn: matched,
          coverUrl:
            typeof info.cover_i === 'number'
              ? `https://covers.openlibrary.org/b/id/${info.cover_i}-M.jpg`
              : undefined,
          status: 'want_to_read',
        },
      },
    ];
  });
}
export const providers: LookupProvider[] = [
  {
    name: 'Google Books',
    async search(query, mode, signal) {
      const prefix = {
        all: '',
        isbn: 'isbn:',
        title: 'intitle:',
        author: 'inauthor:',
      }[mode];
      const params = new URLSearchParams({
        q: prefix + query,
        maxResults: '12',
        printType: 'books',
      });
      return normalizeGoogle(
        await get(
          `https://www.googleapis.com/books/v1/volumes?${params}`,
          signal,
        ),
      );
    },
  },
  {
    name: 'Open Library',
    async search(query, mode, signal) {
      const params = new URLSearchParams({
        limit: '12',
        fields: 'key,title,author_name,isbn,cover_i',
      });
      params.set(
        { all: 'q', isbn: 'isbn', title: 'title', author: 'author' }[mode],
        query,
      );
      return normalizeOpenLibrary(
        await get(`https://openlibrary.org/search.json?${params}`, signal),
        mode === 'isbn' ? query : undefined,
      );
    },
  },
];
export async function searchBooks(
  query: string,
  mode: SearchMode,
  signal: AbortSignal,
  sources = providers,
): Promise<{ results: BookResult[]; warnings: string[] }> {
  let term = query.trim();
  if (!term) return { results: [], warnings: [] };
  if (mode === 'isbn') {
    const isbn = canonicalIsbn(term);
    if (!isbn) throw new Error('Ange ett giltigt ISBN-10 eller ISBN-13.');
    term = isbn;
  }
  // Sequential fallback avoids unnecessary requests. Each provider has an independent timeout.
  const warnings: string[] = [];
  for (const source of sources) {
    if (signal.aborted)
      throw new DOMException('Avbruten sökning', 'AbortError');
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const results = await source.search(term, mode, controller.signal);
      if (signal.aborted)
        throw new DOMException('Avbruten sökning', 'AbortError');
      if (results.length) return { results, warnings };
    } catch (error) {
      if (signal.aborted) throw error;
      warnings.push(`${source.name} kunde inte nås. Försök igen senare.`);
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
    }
  }
  return { results: [], warnings };
}
