import { validDate, type Book } from './books';

export function finishedYear(book: Book): string | undefined {
  return book.status === 'finished' &&
    book.finishedAt &&
    validDate(book.finishedAt)
    ? book.finishedAt.slice(0, 4)
    : undefined;
}

export function readingYears(
  books: Book[],
  currentYear = new Date().getFullYear(),
) {
  return [
    ...new Set([
      String(currentYear),
      ...books.flatMap((book) => finishedYear(book) || []),
    ]),
  ].sort((a, b) => b.localeCompare(a));
}

export function readingStatistics(books: Book[], year: string) {
  const finished = books.filter((book) => book.status === 'finished');
  const selected = finished.filter((book) => finishedYear(book) === year);
  const rated = selected.filter((book) => book.rating !== undefined);
  return {
    count: selected.length,
    average: rated.length
      ? rated.reduce((sum, book) => sum + book.rating!, 0) / rated.length
      : undefined,
    undated: finished.filter((book) => !finishedYear(book)).length,
    months: Array.from(
      { length: 12 },
      (_, month) =>
        selected.filter(
          (book) => Number(book.finishedAt!.slice(5, 7)) === month + 1,
        ).length,
    ),
  };
}
