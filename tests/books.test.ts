import { describe, it, expect } from 'vitest';
import { isBook, selectBooks, validateBook, type Book } from '../src/lib/books';
import { createLocalStorage, STORAGE_KEY } from '../src/lib/storage';
const book: Book = {
  id: '1',
  title: 'En bok',
  authors: ['Åsa  Larsson'],
  status: 'reading',
  createdAt: '2026-10-27T10:00:00Z',
  updatedAt: '2026-10-27T10:00:00Z',
};
describe('boklogik', () => {
  it('söker oberoende av stora bokstäver och extra mellanslag', () =>
    expect(selectBooks([book], '  ÅSA  larsson ', 'all', 'title')).toEqual([
      book,
    ]));
  it('filtrerar lässtatus', () =>
    expect(selectBooks([book], '', 'finished', 'title')).toEqual([]));
  it('sorterar utan att ändra originallistan', () => {
    const input = [
      { ...book, title: 'Ön' },
      { ...book, id: '2', title: 'Alfabet' },
    ];
    expect(selectBooks(input, '', 'all', 'title')[0].title).toBe('Alfabet');
    expect(input[0].title).toBe('Ön');
  });
  it('avvisar felaktiga fält', () => {
    expect(validateBook({ ...book, title: ' ' })).toBeTruthy();
    expect(
      validateBook({ ...book, coverUrl: 'javascript:alert(1)' }),
    ).toBeTruthy();
    expect(validateBook({ ...book, startedAt: '2026-02-30' })).toBeTruthy();
    expect(
      validateBook({
        ...book,
        startedAt: '2026-05-01',
        finishedAt: '2026-04-01',
      }),
    ).toBeTruthy();
    expect(isBook({ ...book, status: 'constructor' })).toBe(false);
  });
});
describe('lokal lagring', () => {
  it('sparar och läser samma bok med alla fält', () => {
    const data = new Map<string, string>();
    const storage = createLocalStorage({
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => {
        data.set(k, v);
      },
    });
    const full = {
      ...book,
      rating: 5,
      notes: 'Mina tankar',
      isbn: '9781234567897',
    };
    storage.save([full]);
    expect(storage.load()).toEqual([full]);
  });
  it('skriver aldrig över trasiga data vid läsning', () => {
    const raw = '{broken';
    let changed = false;
    const storage = createLocalStorage({
      getItem: () => raw,
      setItem: () => {
        changed = true;
      },
    });
    expect(() => storage.load()).toThrow();
    expect(changed).toBe(false);
  });
  it('avvisar okända versioner och dubbletter av interna id', () => {
    for (const data of [
      { version: 2, books: [] },
      { version: 1, books: [book, book] },
    ]) {
      const storage = createLocalStorage({
        getItem: () => JSON.stringify(data),
        setItem: () => {},
      });
      expect(() => storage.load()).toThrow();
    }
  });
  it('rapporterar full lagring', () => {
    const storage = createLocalStorage({
      getItem: () => null,
      setItem: () => {
        throw new DOMException('Fullt', 'QuotaExceededError');
      },
    });
    expect(() => storage.save([book])).toThrow();
    expect(STORAGE_KEY).toBe('boktok.library.v1');
  });
});
