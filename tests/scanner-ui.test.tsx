import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
const mocks = vi.hoisted(() => ({
  scan: vi.fn(),
  photo: vi.fn(),
  cover: vi.fn(),
}));
vi.mock('../src/lib/barcode', () => ({
  startIsbnScanner: mocks.scan,
  isbnFromPhoto: mocks.photo,
}));
vi.mock('../src/lib/ocr', () => ({ readCover: mocks.cover }));
import BookScanner from '../src/components/BookScanner';
import { BookLookup } from '../src/components/BookLookup';
import { providers } from '../src/lib/lookup';
import { LibraryView } from '../src/components/LibraryView';
import type { Book } from '../src/lib/books';
const original: Book = {
  id: '1',
  title: 'Solstorm',
  authors: ['Åsa Larsson'],
  status: 'finished',
  rating: 5,
  notes: 'Bra',
  isbn: '9780306406157',
  finishedAt: '2025-12-31',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};
beforeEach(() => {
  mocks.scan.mockReset().mockResolvedValue(undefined);
  mocks.photo.mockReset();
  mocks.cover.mockReset();
});
afterEach(cleanup);
const image = () => new File(['image'], 'book.jpg', { type: 'image/jpeg' });

describe('skanning och omslagsläsning', () => {
  it('startar kameran först efter klick och avbryter när dialogen stängs', async () => {
    const user = userEvent.setup();
    const search = vi.fn();
    render(<BookScanner onSearch={search} />);
    await user.click(screen.getByRole('button', { name: 'Skanna ISBN' }));
    expect(mocks.scan).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Starta kameran' }));
    await waitFor(() => expect(mocks.scan).toHaveBeenCalledOnce());
    const signal = mocks.scan.mock.calls[0][1] as AbortSignal;
    await user.click(screen.getByRole('button', { name: 'Stäng' }));
    expect(signal.aborted).toBe(true);
    expect(search).not.toHaveBeenCalled();
  });
  it('visar ett begripligt fel om kameraåtkomsten nekas', async () => {
    mocks.scan.mockRejectedValue(new DOMException('', 'NotAllowedError'));
    const user = userEvent.setup();
    render(<BookScanner onSearch={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Skanna ISBN' }));
    await user.click(screen.getByRole('button', { name: 'Starta kameran' }));
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Tillåt kameran',
    );
    expect(screen.getByRole('button', { name: 'Välj bild' })).toBeTruthy();
  });
  it('låter användaren rätta och rensa omslagstext före sökning', async () => {
    mocks.cover.mockResolvedValue('ÅSA LARSSON SOLSTORM');
    const search = vi.fn();
    const user = userEvent.setup();
    render(<BookScanner onSearch={search} />);
    await user.click(screen.getByRole('button', { name: 'Läs bokomslag' }));
    await user.upload(screen.getByLabelText('Bild av bokomslag'), image());
    const field = await screen.findByLabelText(
      'Titel och författare att söka efter',
    );
    expect(search).not.toHaveBeenCalled();
    await user.clear(field);
    expect(
      screen.getByLabelText('Titel och författare att söka efter'),
    ).toBeTruthy();
    expect(
      (
        screen.getByRole('button', {
          name: 'Sök efter boken',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    await user.type(field, 'Solstorm Åsa Larsson');
    await user.click(screen.getByRole('button', { name: 'Sök efter boken' }));
    expect(search).toHaveBeenCalledExactlyOnceWith(
      'Solstorm Åsa Larsson',
      'all',
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('ignorerar en sen omslagsläsning efter avbrott', async () => {
    let resolve!: (text: string) => void;
    mocks.cover.mockImplementation(
      () =>
        new Promise<string>((done) => {
          resolve = done;
        }),
    );
    const user = userEvent.setup();
    const search = vi.fn();
    render(<BookScanner onSearch={search} />);
    await user.click(screen.getByRole('button', { name: 'Läs bokomslag' }));
    await user.upload(screen.getByLabelText('Bild av bokomslag'), image());
    await waitFor(() => expect(mocks.cover).toHaveBeenCalledOnce());
    const signal = mocks.cover.mock.calls[0][1] as AbortSignal;
    await user.click(screen.getByRole('button', { name: 'Avbryt läsning' }));
    expect(signal.aborted).toBe(true);
    resolve('Ska inte visas');
    await waitFor(() =>
      expect(
        screen.queryByLabelText('Titel och författare att söka efter'),
      ).toBeNull(),
    );
    expect(search).not.toHaveBeenCalled();
  });
  it('stoppar kameran när appen hamnar i bakgrunden', async () => {
    const user = userEvent.setup();
    render(<BookScanner onSearch={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Skanna ISBN' }));
    await user.click(screen.getByRole('button', { name: 'Starta kameran' }));
    await waitFor(() => expect(mocks.scan).toHaveBeenCalledOnce());
    const signal = mocks.scan.mock.calls[0][1] as AbortSignal;
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    fireEvent(document, new Event('visibilitychange'));
    expect(signal.aborted).toBe(true);
    hidden.mockRestore();
  });
  it('söker med skannat ISBN och visar dubbletter före bokval', async () => {
    mocks.photo.mockResolvedValue('9780306406157');
    const provider = vi
      .spyOn(providers[0], 'search')
      .mockResolvedValue([
        { key: 'one', source: 'Google Books', book: original },
      ]);
    const choose = vi.fn();
    const user = userEvent.setup();
    render(<BookLookup books={[original]} onChoose={choose} />);
    await user.click(screen.getByRole('button', { name: 'Skanna ISBN' }));
    await user.upload(screen.getByLabelText('Bild av ISBN-streckkod'), image());
    const result = await screen.findByRole('button', {
      name: /Solstorm.*Åsa Larsson/,
    });
    expect(provider).toHaveBeenCalledWith(
      '9780306406157',
      'isbn',
      expect.any(AbortSignal),
    );
    expect(screen.getByText(/En bok med detta ISBN finns redan/)).toBeTruthy();
    expect(choose).not.toHaveBeenCalled();
    await user.click(result);
    expect(choose).toHaveBeenCalledOnce();
  });
});
describe('filter och statistik i biblioteket', () => {
  it('kombinerar filter och rensar alla filter från tomt resultat', async () => {
    const user = userEvent.setup();
    render(
      <LibraryView
        books={[
          original,
          {
            ...original,
            id: '2',
            title: 'Utan betyg',
            rating: undefined,
            notes: '',
          },
        ]}
        blocked={false}
        error=""
        notice=""
        onOpen={vi.fn()}
      />,
    );
    await user.click(
      screen.getByRole('combobox', { name: 'Filtrera på stjärnbetyg' }),
    );
    await user.click(screen.getByRole('option', { name: '5 stjärnor' }));
    expect(screen.getByRole('button', { name: 'Visa Solstorm' })).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Visa Utan betyg' }),
    ).toBeNull();
    await user.click(
      screen.getByRole('combobox', { name: 'Filtrera på anteckningar' }),
    );
    await user.click(screen.getByRole('option', { name: 'Utan anteckning' }));
    expect(screen.getByText('Inga böcker matchar din sökning')).toBeTruthy();
    await user.click(
      screen.getByRole('button', { name: 'Rensa sökning och filter' }),
    );
    expect(screen.getByRole('button', { name: 'Visa Solstorm' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Visa Utan betyg' }),
    ).toBeTruthy();
  });
  it('byter statistikår och visar böcker utan läsdatum separat', async () => {
    const user = userEvent.setup();
    render(
      <LibraryView
        books={[original, { ...original, id: '2', finishedAt: undefined }]}
        blocked={false}
        error=""
        notice=""
        onOpen={vi.fn()}
      />,
    );
    await user.click(screen.getByText('Lässtatistik'));
    await user.click(
      screen.getByRole('combobox', { name: 'År för lässtatistik' }),
    );
    await user.click(screen.getByRole('option', { name: '2025' }));
    expect(screen.getByText('Lästa 2025')).toBeTruthy();
    const table = screen.getByRole('table');
    expect(within(table).getByRole('row', { name: 'december 1' })).toBeTruthy();
    expect(screen.getByText(/1 läst bok saknar läsdatum/)).toBeTruthy();
  });
});
