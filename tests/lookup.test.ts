import { describe, expect, it, vi } from 'vitest';
import {
  normalizeGoogle,
  normalizeOpenLibrary,
  searchBooks,
  type LookupProvider,
} from '../src/lib/lookup';
const fixture = {
  items: [
    {
      id: 'a',
      volumeInfo: {
        title: 'En bok',
        authors: ['Anna'],
        industryIdentifiers: [{ identifier: '0306406152' }],
        imageLinks: { thumbnail: 'http://books.google.com/image' },
        description: 'Beskrivning',
      },
    },
    { id: 'b', volumeInfo: {} },
    null,
  ],
};
describe('bokuppslag', () => {
  it('normaliserar Google Books och saknade uppgifter', () => {
    const results = normalizeGoogle(fixture);
    expect(results).toHaveLength(1);
    expect(results[0].book).toMatchObject({
      title: 'En bok',
      authors: ['Anna'],
      isbn: '9780306406157',
      coverUrl: 'https://books.google.com/image',
    });
    expect(normalizeGoogle({})).toEqual([]);
  });
  it('väljer aldrig ett godtyckligt ISBN från ett verk med flera utgåvor', () => {
    const data = {
      docs: [
        {
          key: '/works/1',
          title: 'Titel',
          isbn: ['0306406152', '9780804429573'],
          author_name: ['Anna'],
          cover_i: 12,
        },
      ],
    };
    expect(normalizeOpenLibrary(data)[0].book.isbn).toBeUndefined();
    expect(normalizeOpenLibrary(data, '9780306406157')[0].book.isbn).toBe(
      '9780306406157',
    );
  });
  it('provar nästa datakälla vid fel och behåller varningen', async () => {
    const fallback = vi.fn().mockResolvedValue(normalizeGoogle(fixture));
    const sources: LookupProvider[] = [
      {
        name: 'Google Books',
        search: vi.fn().mockRejectedValue(new Error('429')),
      },
      { name: 'Open Library', search: fallback },
    ];
    const result = await searchBooks(
      '0306406152',
      'isbn',
      new AbortController().signal,
      sources,
    );
    expect(result.results).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(fallback.mock.calls[0][0]).toBe('9780306406157');
  });
  it('provar nästa datakälla vid tomt resultat och skiljer fel från tomma träffar', async () => {
    const empty = { name: 'Tom', search: vi.fn().mockResolvedValue([]) };
    expect(
      await searchBooks('Titel', 'title', new AbortController().signal, [
        empty,
        empty,
      ]),
    ).toEqual({ results: [], warnings: [] });
    expect(empty.search).toHaveBeenCalledTimes(2);
  });
  it('stoppar ogiltiga ISBN och avbrutna sökningar före nätverket', async () => {
    const source = { name: 'Källa', search: vi.fn() };
    await expect(
      searchBooks('1234', 'isbn', new AbortController().signal, [source]),
    ).rejects.toThrow('giltigt ISBN');
    const controller = new AbortController();
    controller.abort();
    await expect(
      searchBooks('Titel', 'title', controller.signal, [source]),
    ).rejects.toThrow();
    expect(source.search).not.toHaveBeenCalled();
  });
});
