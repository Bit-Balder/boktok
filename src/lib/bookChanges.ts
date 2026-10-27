import { validateBook, type Book } from './books';
export type BookPatch = Partial<
  Pick<Book, 'status' | 'rating' | 'notes' | 'finishedAt'>
>;
export type BookChange = BookPatch | ((book: Book) => BookPatch);
/** Merge only quick-edit fields into the most recently read book. */
export function applyBookChange(
  books: Book[],
  id: string,
  change: BookChange,
): Book[] {
  const book = books.find((book) => book.id === id);
  if (!book) throw new Error('Boken finns inte längre. Ladda om biblioteket.');
  const patch = typeof change === 'function' ? change(book) : change;
  const next = { ...book };
  for (const field of ['status', 'rating', 'notes', 'finishedAt'] as const) {
    if (Object.hasOwn(patch, field))
      Object.assign(next, { [field]: patch[field] });
  }
  const error = validateBook(next);
  if (error) throw new Error(error);
  if (
    JSON.stringify({ ...next, updatedAt: '' }) ===
    JSON.stringify({ ...book, updatedAt: '' })
  )
    return books;
  next.updatedAt = new Date().toISOString();
  return books.map((b) => (b.id === id ? next : b));
}
