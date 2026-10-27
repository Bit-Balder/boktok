import { describe, expect, it } from 'vitest';
import { selectBooks, type Book } from '../src/lib/books';
import { readingStatistics, readingYears } from '../src/lib/statistics';
const base: Book = {
  id: '1',
  title: 'Vinter',
  authors: ['Anna'],
  status: 'finished',
  finishedAt: '2025-12-31',
  rating: 5,
  notes: 'Bra',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};
const books: Book[] = [
  base,
  {
    ...base,
    id: '2',
    title: 'Sommar',
    finishedAt: '2026-01-01',
    rating: 3,
    notes: '',
  },
  {
    ...base,
    id: '3',
    finishedAt: '2026-01-31',
    rating: undefined,
    notes: '   ',
  },
  { ...base, id: '4', finishedAt: undefined, rating: 4 },
  { ...base, id: '5', status: 'reading', finishedAt: '2026-01-01' },
];
describe('bibliotekets kombinerade filter', () => {
  it('kombinerar sökning, status, exakt betyg, anteckning och läsår', () => {
    expect(
      selectBooks(books, 'anna', 'finished', 'title', {
        rating: '5',
        notes: 'with',
        year: '2025',
      }),
    ).toEqual([base]);
    expect(
      selectBooks(books, '', 'reading', 'newest', { year: '2026' }),
    ).toEqual([]);
  });
  it('skiljer tomma anteckningar och saknade betyg från ifyllda värden', () => {
    expect(
      selectBooks(books, '', 'all', 'newest', {
        rating: 'unrated',
        notes: 'without',
      }).map((b) => b.id),
    ).toEqual(['3']);
    expect(
      selectBooks(books, '', 'all', 'newest', { notes: 'without' }).map(
        (b) => b.id,
      ),
    ).toEqual(['2', '3']);
  });
  it('sorterar efter betyg och läsdatum utan att ändra böckerna', () => {
    const copy = structuredClone(books);
    expect(
      selectBooks(books, '', 'all', 'rating').map((b) => b.rating),
    ).toEqual([5, 5, 4, 3, undefined]);
    expect(selectBooks(books, '', 'all', 'finished').map((b) => b.id)).toEqual([
      '3',
      '2',
      '1',
      '4',
      '5',
    ]);
    expect(books).toEqual(copy);
  });
});
describe('lässtatistik', () => {
  it('använder läsdatum och rätt år vid årsskiftet', () => {
    expect(readingStatistics(books, '2025').count).toBe(1);
    const stats = readingStatistics(books, '2026');
    expect(stats.count).toBe(2);
    expect(stats.months).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(stats.average).toBe(3);
    expect(stats.undated).toBe(1);
    expect(readingYears(books, 2027)).toEqual(['2027', '2026', '2025']);
  });
  it('hanterar tomt bibliotek, saknade datum och saknade betyg', () => {
    expect(readingStatistics([], '2026')).toMatchObject({
      count: 0,
      average: undefined,
      undated: 0,
    });
    expect(
      readingStatistics([{ ...base, finishedAt: '2026-02-30' }], '2026'),
    ).toMatchObject({ count: 0, undated: 1 });
    expect(
      readingStatistics([{ ...base, rating: undefined }], '2025').average,
    ).toBeUndefined();
  });
});
