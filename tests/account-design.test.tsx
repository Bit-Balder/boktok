import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Workspace } from '../src/App';
import type { AccountController } from '../src/hooks/useAccount';
import type { LibraryController } from '../src/lib/library';
import { BookCard } from '../src/components/BookCard';
import type { Book } from '../src/lib/books';
const book: Book = {
  id: 'one',
  title: 'En bok',
  authors: ['Anna'],
  status: 'finished',
  rating: 3,
  notes: 'En tanke',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};
function fixtures() {
  const account: AccountController = {
    user: null,
    ready: true,
    pending: false,
    error: '',
    configured: true,
    login: vi.fn().mockResolvedValue(true),
    register: vi.fn().mockResolvedValue(true),
    google: vi.fn().mockResolvedValue(true),
    logout: vi.fn().mockResolvedValue(true),
    reset: vi.fn().mockResolvedValue(true),
  };
  const library: LibraryController = {
    books: [],
    error: '',
    blocked: false,
    loading: false,
    pending: false,
    imports: null,
    save: vi.fn().mockReturnValue({ status: 'saved' }),
    update: vi.fn().mockReturnValue(true),
    remove: vi.fn().mockReturnValue(true),
  };
  return { account, library };
}
beforeEach(() => localStorage.clear());
afterEach(cleanup);
it('öppnar inloggningen från sidhuvudet och håller alternativen i rätt ordning', async () => {
  const user = userEvent.setup();
  const { account, library } = fixtures();
  render(<Workspace account={account} library={library} reload={vi.fn()} />);
  await user.click(
    within(screen.getByRole('banner')).getByRole('button', {
      name: 'Logga in',
    }),
  );
  const dialog = screen.getByRole('dialog', { name: 'Logga in' });
  expect(
    within(dialog)
      .getAllByRole('button')
      .map((button) => button.textContent),
  ).toEqual([
    '',
    'Logga in',
    'Fortsätt med Google',
    'Glömt lösenord?',
    'Registrera dig',
  ]);
  await user.type(screen.getByLabelText('E-postadress'), 'anna@example.com');
  await user.type(screen.getByLabelText('Lösenord'), 'password');
  await user.click(within(dialog).getByRole('button', { name: 'Logga in' }));
  expect(account.login).toHaveBeenCalledWith('anna@example.com', 'password');
  await user.click(screen.getByRole('button', { name: 'Fortsätt med Google' }));
  expect(account.google).toHaveBeenCalledOnce();
  await user.click(screen.getByRole('button', { name: 'Stäng' }));
  await user.click(screen.getByRole('button', { name: 'Inställningar' }));
  expect(screen.queryByLabelText('E-postadress')).toBeNull();
  expect(
    screen.queryByRole('button', { name: 'Fortsätt med Google' }),
  ).toBeNull();
});
it('når registrering och lösenordsåterställning från samma dialog', async () => {
  const user = userEvent.setup();
  const { account, library } = fixtures();
  render(<Workspace account={account} library={library} reload={vi.fn()} />);
  await user.click(screen.getByRole('button', { name: 'Logga in' }));
  await user.click(screen.getByRole('button', { name: 'Registrera dig' }));
  expect(screen.getByRole('dialog', { name: 'Registrera dig' })).toBeTruthy();
  await user.type(screen.getByLabelText('E-postadress'), 'anna@example.com');
  await user.type(screen.getByLabelText('Lösenord'), 'password');
  await user.type(screen.getByLabelText('Upprepa lösenord'), 'password');
  await user.click(screen.getByRole('button', { name: 'Skapa konto' }));
  expect(account.register).toHaveBeenCalledWith('anna@example.com', 'password');
  await user.click(
    screen.getByRole('button', { name: 'Tillbaka till inloggning' }),
  );
  await user.click(screen.getByRole('button', { name: 'Glömt lösenord?' }));
  expect(screen.queryByLabelText('Lösenord')).toBeNull();
  await user.click(
    screen.getByRole('button', { name: 'Skicka återställningslänk' }),
  );
  expect(account.reset).toHaveBeenCalledWith('anna@example.com');
});
it('visar profilbild, reservsymbol, kontoinformation och import via profilen', async () => {
  const user = userEvent.setup();
  const { account, library } = fixtures();
  account.user = {
    uid: 'alice',
    email: 'anna@example.com',
    displayName: 'Anna',
    photoURL: 'https://example.com/photo.png',
  };
  library.books = [book];
  library.imports = {
    items: [{ book, matches: [] }],
    loading: false,
    error: '',
    notice: '',
    run: vi.fn().mockResolvedValue(undefined),
  };
  render(<Workspace account={account} library={library} reload={vi.fn()} />);
  const profile = screen.getByRole('button', { name: 'Öppna profil' });
  const photo = profile.querySelector('img');
  expect(photo).toBeTruthy();
  fireEvent.error(photo!);
  expect(profile.querySelector('img')).toBeNull();
  await user.click(profile);
  expect(screen.getByRole('dialog', { name: 'Din profil' })).toBeTruthy();
  expect(screen.getByText('anna@example.com')).toBeTruthy();
  expect(screen.getByText('1 bok i ditt privata molnbibliotek')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Granska import' }));
  await user.click(screen.getByRole('button', { name: 'Importera bok' }));
  expect(library.imports.run).toHaveBeenCalledWith(
    { book, matches: [] },
    'add',
    false,
  );
  await user.click(screen.getByRole('button', { name: 'Logga ut' }));
  expect(account.logout).toHaveBeenCalledOnce();
});
it('skyddar bokutkastet innan ett inloggningsförsök', async () => {
  const user = userEvent.setup();
  const { account, library } = fixtures();
  render(<Workspace account={account} library={library} reload={vi.fn()} />);
  await user.click(screen.getByRole('button', { name: 'Lägg till bok' }));
  expect(screen.queryByRole('button', { name: 'Spara bok' })).toBeNull();
  await user.type(screen.getByLabelText('Titel *'), 'Osparad bok');
  expect(screen.getByRole('button', { name: 'Spara bok' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Logga in' }));
  await user.click(screen.getByRole('button', { name: 'Fortsätt med Google' }));
  expect(account.google).not.toHaveBeenCalled();
  await user.click(
    within(
      screen.getByRole('dialog', { name: 'Lämna osparade ändringar?' }),
    ).getByRole('button', { name: 'Avbryt' }),
  );
  await user.click(screen.getByRole('button', { name: 'Stäng' }));
  expect((screen.getByLabelText('Titel *') as HTMLInputElement).value).toBe(
    'Osparad bok',
  );
});
it('visar en diskret anteckningsmarkering endast när boken har text', () => {
  const view = render(<BookCard book={book} onOpen={vi.fn()} />);
  expect(
    screen
      .getByRole('button', { name: 'Visa En bok' })
      .getAttribute('aria-describedby'),
  ).toBeTruthy();
  expect(screen.getByText('Har en sparad anteckning')).toBeTruthy();
  expect(screen.getByRole('img', { name: 'Betyg 3 av 5' })).toBeTruthy();
  view.rerender(<BookCard book={{ ...book, notes: '   ' }} onOpen={vi.fn()} />);
  expect(screen.queryByText('Har en sparad anteckning')).toBeNull();
  expect(
    screen
      .getByRole('button', { name: 'Visa En bok' })
      .getAttribute('aria-describedby'),
  ).toBeNull();
});
