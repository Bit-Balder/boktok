import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { chooseCover, findCover } from '../src/lib/lookup/cover';
import { providers, type BookResult } from '../src/lib/lookup';
import App from '../src/App';
import { localLibrary } from '../src/lib/storage';
const book = {
  title: 'Boken',
  authors: ['Anna'],
  isbn: '9780306406157',
  status: 'want_to_read' as const,
};
function result(
  title = 'Boken',
  isbn?: string,
  coverUrl = 'https://example.com/cover.jpg',
): BookResult {
  return {
    key: title,
    source: 'Google Books',
    book: { ...book, title, isbn, coverUrl },
  };
}
afterEach(() => {
  cleanup();
  localStorage.clear();
});
describe('automatiska omslag', () => {
  it('prioriterar ISBN framför titel och tar även hänsyn till fler identifikatorer', () => {
    const exact = {
      ...result('Annan titel', undefined, 'https://example.com/exact.jpg'),
      isbns: ['0306406152'],
    };
    expect(chooseCover(book, [result(), exact])).toBe(exact.book.coverUrl);
  });
  it('accepterar första matchande titel med annat eller saknat ISBN', () => {
    expect(
      chooseCover(book, [result('Fel bok'), result('Boken', '9780804429573')]),
    ).toBe('https://example.com/cover.jpg');
    expect(chooseCover(book, [result('Boken : en undertitel')])).toBe(
      'https://example.com/cover.jpg',
    );
    expect(
      chooseCover(book, [
        result('Fel bok'),
        result('Boken', undefined, 'javascript:alert(1)'),
      ]),
    ).toBeUndefined();
  });
  it('söker med titel och författare och använder Open Library om Google saknar omslag', async () => {
    const google = vi.fn().mockResolvedValue([result('Fel bok')]);
    const open = vi.fn().mockResolvedValue([result()]);
    const input = structuredClone(book);
    expect(
      await findCover(book, new AbortController().signal, [
        { name: 'Google Books', search: google },
        { name: 'Open Library', search: open },
      ]),
    ).toBe('https://example.com/cover.jpg');
    expect(google).toHaveBeenCalledWith(
      'Boken Anna',
      'all',
      expect.any(AbortSignal),
    );
    expect(open).toHaveBeenCalledOnce();
    expect(book).toEqual(input);
  });
  it('frågar inte fler källor vid träff eller när boken redan har omslag', async () => {
    const google = vi.fn().mockResolvedValue([result()]);
    const open = vi.fn();
    const sources = [
      { name: 'Google Books', search: google },
      { name: 'Open Library', search: open },
    ];
    await findCover(
      { ...book, coverUrl: 'https://example.com/existing.jpg' },
      new AbortController().signal,
      sources,
    );
    expect(google).not.toHaveBeenCalled();
    await findCover(book, new AbortController().signal, sources);
    expect(open).not.toHaveBeenCalled();
  });
  it('ignorerar avbrutna svar och frågar inte nästa källa', async () => {
    const controller = new AbortController();
    const open = vi.fn();
    const first = vi.fn().mockImplementation(async () => {
      controller.abort();
      return [result()];
    });
    expect(
      await findCover(book, controller.signal, [
        { name: 'Google Books', search: first },
        { name: 'Open Library', search: open },
      ]),
    ).toBeUndefined();
    expect(open).not.toHaveBeenCalled();
  });
  it('fyller i omslaget och sparar Libris uppgifter efter bokvalet', async () => {
    localStorage.clear();
    vi.spyOn(providers[0], 'search').mockResolvedValue([
      { key: 'libris', source: 'Libris', book },
    ]);
    vi.spyOn(providers[1], 'search').mockResolvedValue([
      result('Boken', '9780804429573'),
    ]);
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Lägg till bok' }));
    await user.type(screen.getByLabelText('Sök i bokdatabaser'), 'Boken');
    await user.click(screen.getByRole('button', { name: /^Sök$/ }));
    await user.click(
      await screen.findByRole('button', { name: /Boken.*Anna/ }),
    );
    await waitFor(() =>
      expect(
        (
          screen.getByLabelText(
            'Omslagsbild · HTTPS-adress',
          ) as HTMLInputElement
        ).value,
      ).toBe('https://example.com/cover.jpg'),
    );
    await user.click(screen.getByRole('button', { name: 'Spara bok' }));
    expect(localLibrary.load()[0]).toMatchObject({
      ...book,
      coverUrl: 'https://example.com/cover.jpg',
    });
  });
  it('ersätter inte en manuellt angiven bild med ett sent svar', async () => {
    vi.spyOn(providers[0], 'search').mockResolvedValue([
      { key: 'libris', source: 'Libris', book },
    ]);
    let resolve!: (results: BookResult[]) => void;
    vi.spyOn(providers[1], 'search').mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Lägg till bok' }));
    await user.type(screen.getByLabelText('Sök i bokdatabaser'), 'Boken');
    await user.click(screen.getByRole('button', { name: /^Sök$/ }));
    await user.click(
      await screen.findByRole('button', { name: /Boken.*Anna/ }),
    );
    const field = screen.getByLabelText('Omslagsbild · HTTPS-adress');
    await user.type(field, 'https://example.com/manual.jpg');
    resolve([result()]);
    await waitFor(() =>
      expect((field as HTMLInputElement).value).toBe(
        'https://example.com/manual.jpg',
      ),
    );
  });
});
