import { normalize, type Book, type BookInput } from './books';
import { canonicalIsbn } from './isbn';
export type Duplicate = {
  book: Book;
  reason: 'isbn' | 'title-author' | 'title';
};
export function findDuplicates(
  input: BookInput,
  books: Book[],
  excludeId?: string,
): Duplicate[] {
  const isbn = canonicalIsbn(input.isbn);
  const title = normalize(input.title);
  const authors = (values: string[]) =>
    values.map(normalize).filter(Boolean).sort().join('|');
  const author = authors(input.authors);
  return books
    .flatMap((book): Duplicate[] => {
      if (book.id === excludeId) return [];
      if (isbn && isbn === canonicalIsbn(book.isbn))
        return [{ book, reason: 'isbn' }];
      if (!title || title !== normalize(book.title)) return [];
      return [
        {
          book,
          reason:
            author && author === authors(book.authors)
              ? 'title-author'
              : 'title',
        },
      ];
    })
    .sort(
      (a, b) =>
        ['isbn', 'title-author', 'title'].indexOf(a.reason) -
        ['isbn', 'title-author', 'title'].indexOf(b.reason),
    );
}
