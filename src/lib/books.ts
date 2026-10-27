export const statuses = {
  want_to_read: 'Vill läsa',
  reading: 'Läser',
  finished: 'Läst',
} as const;
export type Status = keyof typeof statuses;
export interface Book {
  id: string;
  title: string;
  authors: string[];
  isbn?: string;
  coverUrl?: string;
  description?: string;
  status: Status;
  startedAt?: string;
  finishedAt?: string;
  rating?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
export type BookInput = Omit<Book, 'id' | 'createdAt' | 'updatedAt'>;
export type Sort = 'newest' | 'title' | 'rating' | 'finished';
export interface BookFilters {
  rating?: 'all' | 'unrated' | '1' | '2' | '3' | '4' | '5';
  notes?: 'all' | 'with' | 'without';
  year?: string;
}
export function normalize(value: string) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('sv')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
export function selectBooks(
  books: Book[],
  query: string,
  status: Status | 'all',
  sort: Sort,
  filters: BookFilters = {},
) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return books
    .filter(
      (book) =>
        (status === 'all' || book.status === status) &&
        (!filters.rating ||
          filters.rating === 'all' ||
          (filters.rating === 'unrated'
            ? book.rating === undefined
            : book.rating === Number(filters.rating))) &&
        (!filters.notes ||
          filters.notes === 'all' ||
          (filters.notes === 'with'
            ? Boolean(book.notes?.trim())
            : !book.notes?.trim())) &&
        (!filters.year ||
          filters.year === 'all' ||
          (book.status === 'finished' &&
            Boolean(book.finishedAt && validDate(book.finishedAt)) &&
            book.finishedAt?.slice(0, 4) === filters.year)) &&
        terms.every((term) =>
          normalize([book.title, ...book.authors].join(' ')).includes(term),
        ),
    )
    .sort((a, b) =>
      sort === 'title'
        ? a.title.localeCompare(b.title, 'sv')
        : sort === 'rating'
          ? (b.rating || 0) - (a.rating || 0) ||
            b.createdAt.localeCompare(a.createdAt)
          : sort === 'finished'
            ? (b.status === 'finished' ? b.finishedAt || '' : '').localeCompare(
                a.status === 'finished' ? a.finishedAt || '' : '',
              ) || b.createdAt.localeCompare(a.createdAt)
            : b.createdAt.localeCompare(a.createdAt),
    );
}
export function validCover(value: string) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}
export function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function validateBook(book: BookInput): string | null {
  if (!book.title.trim()) return 'Skriv en titel.';
  if (book.coverUrl && !validCover(book.coverUrl))
    return 'Omslagsbilden behöver en giltig HTTPS-adress.';
  if (
    book.rating !== undefined &&
    (!Number.isInteger(book.rating) || book.rating < 1 || book.rating > 5)
  )
    return 'Välj ett betyg mellan 1 och 5.';
  if (
    (book.startedAt && !validDate(book.startedAt)) ||
    (book.finishedAt && !validDate(book.finishedAt))
  )
    return 'Ange ett giltigt datum.';
  if (book.startedAt && book.finishedAt && book.finishedAt < book.startedAt)
    return 'Slutdatum får inte vara före startdatum.';
  return null;
}
export function isBook(value: unknown): value is Book {
  if (!value || typeof value !== 'object') return false;
  const b = value as Record<string, unknown>;
  if (
    typeof b.id !== 'string' ||
    !b.id ||
    typeof b.title !== 'string' ||
    !Array.isArray(b.authors) ||
    !b.authors.every((a) => typeof a === 'string') ||
    typeof b.status !== 'string' ||
    !Object.hasOwn(statuses, b.status)
  )
    return false;
  if (
    typeof b.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(b.createdAt)) ||
    typeof b.updatedAt !== 'string' ||
    !Number.isFinite(Date.parse(b.updatedAt))
  )
    return false;
  for (const key of [
    'isbn',
    'coverUrl',
    'description',
    'startedAt',
    'finishedAt',
    'notes',
  ])
    if (b[key] !== undefined && typeof b[key] !== 'string') return false;
  if (b.rating !== undefined && typeof b.rating !== 'number') return false;
  return validateBook(b as unknown as BookInput) === null;
}
