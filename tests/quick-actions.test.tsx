import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { localLibrary, STORAGE_KEY } from '../src/lib/storage';
import { applyBookChange } from '../src/lib/bookChanges';
import { localDateString } from '../src/lib/dates';
import { providers } from '../src/lib/lookup';
import type { Book } from '../src/lib/books';
const original: Book = {
  id: 'book',
  title: 'En bok',
  authors: ['Anna'],
  status: 'want_to_read',
  rating: 2,
  description: 'Beskrivning',
  isbn: '9780306406157',
  notes: 'En anteckning',
  createdAt: '2026-01-01T12:00:00Z',
  updatedAt: '2026-01-01T12:00:00Z',
};
beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
async function open() {
  localLibrary.save([original]);
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Visa En bok' }));
  return user;
}
describe('snabbhantering', () => {
  it('sparar lässtatus och föreslår datum utan att ändra övriga fält', async () => {
    const user = await open();
    await user.click(screen.getByRole('button', { name: 'Läst' }));
    expect(localLibrary.load()[0]).toMatchObject({
      ...original,
      status: 'finished',
      finishedAt: localDateString(new Date()),
      updatedAt: expect.any(String),
    });
    expect(screen.getByLabelText('Läste klart')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Läser' }));
    expect(localLibrary.load()[0].finishedAt).toBe(localDateString(new Date()));
    await user.click(screen.getByRole('button', { name: 'Stäng' }));
    const filter = screen.getByRole('button', { name: 'Läser 1' });
    await user.click(filter);
    expect(screen.getByRole('button', { name: 'Visa En bok' })).toBeTruthy();
  });
  it('sätter, ändrar och rensar betyg med ett klick per sparning', async () => {
    const user = await open();
    const write = vi.spyOn(Storage.prototype, 'setItem');
    await user.click(screen.getByRole('radio', { name: '3 av 5 stjärnor' }));
    expect(localLibrary.load()[0].rating).toBe(3);
    expect(write).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('radio', { name: '5 av 5 stjärnor' }));
    expect(localLibrary.load()[0].rating).toBe(5);
    await user.click(screen.getByRole('radio', { name: '5 av 5 stjärnor' }));
    expect(localLibrary.load()[0].rating).toBeUndefined();
    expect(write).toHaveBeenCalledTimes(3);
    expect(localLibrary.load()[0].notes).toBe(original.notes);
  });
  it('hanterar betyg med tangentbord och behåller betyget efter omladdning', async () => {
    const user = await open();
    const second = screen.getByRole('radio', { name: '2 av 5 stjärnor' });
    second.focus();
    await user.keyboard('{ArrowRight}');
    expect(localLibrary.load()[0].rating).toBe(3);
    cleanup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Visa En bok' }));
    expect(
      screen
        .getByRole('radio', { name: '3 av 5 stjärnor' })
        .getAttribute('aria-checked'),
    ).toBe('true');
  });
  it('visar anteckningar kompakt, sparar och tar bort markeringen när texten raderas', async () => {
    const user = await open();
    expect(screen.queryByLabelText('Egna anteckningar')).toBeNull();
    await user.click(
      screen.getByRole('button', {
        name: 'Anteckningar, sparad anteckning finns',
      }),
    );
    await user.clear(screen.getByLabelText('Egna anteckningar'));
    await user.type(
      screen.getByLabelText('Egna anteckningar'),
      'Ny anteckning',
    );
    expect(localLibrary.load()[0].notes).toBe(original.notes);
    await user.click(screen.getByRole('button', { name: 'Spara anteckning' }));
    expect(screen.queryByLabelText('Egna anteckningar')).toBeNull();
    expect(localLibrary.load()[0].notes).toBe('Ny anteckning');
    await user.click(
      screen.getByRole('button', {
        name: 'Anteckningar, sparad anteckning finns',
      }),
    );
    await user.clear(screen.getByLabelText('Egna anteckningar'));
    await user.click(screen.getByRole('button', { name: 'Spara anteckning' }));
    expect(localLibrary.load()[0].notes).toBeUndefined();
    expect(screen.getByRole('button', { name: 'Anteckningar' })).toBeTruthy();
  });
  it('skyddar en osparad anteckning och behåller texten vid lagringsfel', async () => {
    const user = await open();
    await user.click(
      screen.getByRole('button', {
        name: 'Anteckningar, sparad anteckning finns',
      }),
    );
    await user.type(screen.getByLabelText('Egna anteckningar'), ' tillägg');
    await user.click(screen.getByRole('button', { name: 'Stäng' }));
    await user.click(screen.getByRole('button', { name: 'Fortsätt skriva' }));
    expect(
      (screen.getByLabelText('Egna anteckningar') as HTMLTextAreaElement).value,
    ).toContain('tillägg');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Fullt');
    });
    await user.click(screen.getByRole('button', { name: 'Spara anteckning' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByLabelText('Egna anteckningar')).toBeTruthy();
    expect(localLibrary.load()[0].notes).toBe(original.notes);
  });
  it('läser senaste boken före snabbändring och bevarar ändringar från andra flikar', async () => {
    const user = await open();
    localLibrary.save([
      {
        ...original,
        title: 'Ändrad i annan flik',
        notes: 'Behåll senaste texten',
      },
    ]);
    await user.click(screen.getByRole('radio', { name: '4 av 5 stjärnor' }));
    expect(localLibrary.load()[0]).toMatchObject({
      title: 'Ändrad i annan flik',
      notes: 'Behåll senaste texten',
      rating: 4,
    });
    expect(
      screen.getByRole('dialog', { name: 'Ändrad i annan flik' }),
    ).toBeTruthy();
  });
  it('visar ingen osparad status vid lagringsfel', async () => {
    const user = await open();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Fullt');
    });
    await user.click(screen.getByRole('button', { name: 'Läser' }));
    expect(
      screen
        .getByRole('button', { name: 'Vill läsa' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(localLibrary.load()[0].status).toBe('want_to_read');
  });
  it('har en enda Lägg till-knapp och kopplar fasta Spara till rätt formulär', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(
      screen.getAllByRole('button', { name: 'Lägg till bok' }),
    ).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Lägg till bok' }));
    expect(screen.queryByRole('button', { name: 'Spara bok' })).toBeNull();
    await user.type(screen.getByLabelText('Egna anteckningar'), 'Ett utkast');
    const save = screen.getByRole('button', { name: 'Spara bok' });
    expect(save.getAttribute('form')).toBe(
      screen.getByRole('form', { name: 'Bokuppgifter' }).id,
    );
    expect(save.hasAttribute('disabled')).toBe(true);
    await user.type(screen.getByLabelText('Titel *'), 'Ny bok');
    await user.dblClick(save);
    expect(localLibrary.load()).toHaveLength(1);
  });
});
describe('begränsad dataändring', () => {
  it('avvisar saknad bok och ogiltiga datum utan att ändra data', () => {
    expect(() =>
      applyBookChange([original], 'saknas', { rating: 4 }),
    ).toThrow();
    expect(() =>
      applyBookChange([original], original.id, { finishedAt: '2026-02-30' }),
    ).toThrow();
    expect(original.rating).toBe(2);
  });
  it('bevarar övriga uppgifter och gör ingen ändring när betyget är detsamma', () => {
    expect(
      applyBookChange([original], original.id, { rating: 4 })[0],
    ).toMatchObject({ ...original, rating: 4, updatedAt: expect.any(String) });
    const current = [original];
    expect(applyBookChange(current, original.id, { rating: 2 })).toBe(current);
  });
});
it('använder en byggkonfigurerad Google-nyckel utan att skicka anteckningar', async () => {
  vi.stubEnv('VITE_GOOGLE_BOOKS_API_KEY', 'test-key-not-a-secret');
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ totalItems: 0 }), { status: 200 }),
    );
  vi.stubGlobal('fetch', fetchMock);
  await providers
    .find((provider) => provider.name === 'Google Books')!
    .search('Titel', 'title', new AbortController().signal);
  const url = new URL(fetchMock.mock.calls[0][0]);
  expect(url.searchParams.get('key')).toBe('test-key-not-a-secret');
  expect([...url.searchParams.keys()].sort()).toEqual([
    'key',
    'maxResults',
    'printType',
    'q',
  ]);
});
it('skiljer en misslyckad sökning från tomma träffar utan teknisk information i gränssnittet', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response('{}', { status: 429 })),
  );
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Lägg till bok' }));
  await user.type(screen.getByLabelText('Sök i bokdatabaser'), 'Titel');
  await user.click(screen.getByRole('button', { name: 'Sök' }));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.queryByText(/Inga böcker hittades/)).toBeNull();
  expect(screen.queryByText(/HTTP 429/)).toBeNull();
  expect(warn).toHaveBeenCalledTimes(3);
  expect(warn.mock.calls.flat().join(' ')).not.toContain('https://');
  expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
});
