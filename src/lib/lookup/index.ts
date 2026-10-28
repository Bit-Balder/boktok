import type { BookInput } from '../books';
import { canonicalIsbn } from '../isbn';
import { librisParams, normalizeLibris } from './libris';
export type SearchMode = 'all' | 'isbn' | 'title' | 'author';
export interface BookResult {
  isbns?: string[];
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
class LookupHttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}
async function get(
  url: string,
  signal: AbortSignal,
  accept = 'application/json',
): Promise<unknown> {
  const response = await fetch(url, {
    signal,
    headers: { Accept: accept },
    credentials: 'omit',
  });
  if (!response.ok) throw new LookupHttpError(response.status);
  return response.json();
}
export function normalizeGoogle(
  payload: unknown,
  searchedIsbn?: string,
): BookResult[] {
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
    if (searchedIsbn && !ids.includes(searchedIsbn)) return [];
    return [
      {
        key: `google:${string(raw.id) || title}`,
        source: 'Google Books',
        isbns: ids.filter((id): id is string => Boolean(id)),
        book: {
          title,
          authors: strings(info.authors),
          isbn: searchedIsbn || ids[0],
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
    if (searchedIsbn && !matched) return [];
    return [
      {
        key: `openlibrary:${string(info.key) || title}`,
        source: 'Open Library',
        isbns: strings(info.isbn)
          .map(canonicalIsbn)
          .filter((id): id is string => Boolean(id)),
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
    name: 'Libris',
    async search(query, mode, signal) {
      const params = librisParams(query, mode);
      return normalizeLibris(
        await get(
          `https://libris.kb.se/find.jsonld?${params}`,
          signal,
          'application/ld+json',
        ),
        query,
        mode,
      );
    },
  },
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
      const key = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY?.trim();
      if (key) params.set('key', key);
      return normalizeGoogle(
        await get(
          `https://www.googleapis.com/books/v1/volumes?${params}`,
          signal,
        ),
        mode === 'isbn' ? query : undefined,
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
): Promise<{ results: BookResult[]; unavailable: boolean }> {
  let term = query.trim();
  if (!term) return { results: [], unavailable: false };
  if (mode === 'isbn') {
    const isbn = canonicalIsbn(term);
    if (!isbn) throw new Error('Ange ett giltigt ISBN-10 eller ISBN-13.');
    term = isbn;
  }
  // Sequential fallback avoids unnecessary requests. Each provider has an independent timeout.
  let unavailable = false;
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
      if (results.length) return { results, unavailable: false };
    } catch (error) {
      if (signal.aborted) throw error;
      unavailable = true;
      // Never log the request URL, API key, search words or raw provider payloads.
      console.warn(
        `[Boktok] ${source.name}:`,
        error instanceof LookupHttpError
          ? `HTTP ${error.status}`
          : controller.signal.aborted
            ? 'TIMEOUT'
            : 'NETWORK_ERROR',
      );
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
    }
  }
  return { results: [], unavailable };
}
