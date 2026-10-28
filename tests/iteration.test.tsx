import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { DatePicker } from '../src/components/ui/date-picker';
import { canonicalIsbn } from '../src/lib/isbn';
import { findDuplicates } from '../src/lib/duplicates';
import { localDateString, parseLocalDate } from '../src/lib/dates';
import { localLibrary, STORAGE_KEY } from '../src/lib/storage';
import { THEME_KEY } from '../src/hooks/useTheme';
import type { Book } from '../src/lib/books';
const book: Book = {
  id: 'existing',
  title: 'Min bok!',
  authors: ['Åsa Larsson'],
  isbn: '0-306-40615-2',
  status: 'finished',
  rating: 4,
  notes: 'Behåll mig',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};
beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe('ISBN och dubbletter', () => {
  it('kontrollerar kontrollsiffror och översätter ISBN-10', () => {
    expect(canonicalIsbn('0-306-40615-2')).toBe('9780306406157');
    expect(canonicalIsbn('9780306406158')).toBeUndefined();
    expect(canonicalIsbn('080442957X')).toBe('9780804429573');
    expect(canonicalIsbn('12345')).toBeUndefined();
  });
  it('prioriterar ISBN och ignorerar boken vid redigering', () => {
    expect(
      findDuplicates({ ...book, isbn: '9780306406157', title: 'Annan titel' }, [
        book,
      ])[0].reason,
    ).toBe('isbn');
    expect(findDuplicates(book, [book], book.id)).toEqual([]);
  });
  it('normaliserar titel och författare och varnar försiktigt vid annan författare', () => {
    expect(
      findDuplicates(
        {
          ...book,
          isbn: undefined,
          title: '  MIN BOK ',
          authors: ['åsa   larsson'],
        },
        [book],
      )[0].reason,
    ).toBe('title-author');
    expect(
      findDuplicates({ ...book, isbn: undefined, authors: ['Annan'] }, [
        book,
      ])[0].reason,
    ).toBe('title');
  });
});
describe('nya användarflöden', () => {
  it('sparar tre stjärnor, rensar dem och bevarar befintliga böcker', async () => {
    localLibrary.save([book]);
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getAllByRole('button', { name: 'Lägg till bok' })[0],
    );
    await user.type(screen.getByLabelText('Titel *'), 'Ny bok');
    await user.click(screen.getByRole('radio', { name: '3 av 5 stjärnor' }));
    expect(
      screen
        .getByRole('radio', { name: '3 av 5 stjärnor' })
        .getAttribute('aria-checked'),
    ).toBe('true');
    await user.click(screen.getByRole('button', { name: 'Rensa betyg' }));
    expect(
      screen
        .getByRole('radio', { name: '3 av 5 stjärnor' })
        .getAttribute('aria-checked'),
    ).toBe('false');
    await user.click(screen.getByRole('radio', { name: '3 av 5 stjärnor' }));
    await user.click(screen.getByRole('button', { name: 'Spara bok' }));
    expect(localLibrary.load().find((b) => b.title === 'Ny bok')?.rating).toBe(
      3,
    );
    expect(localLibrary.load().find((b) => b.id === book.id)).toEqual(book);
  });
  it('behåller utkast vid avbruten dubblett och tillåter dubblett efter bekräftelse', async () => {
    localLibrary.save([book]);
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getAllByRole('button', { name: 'Lägg till bok' })[0],
    );
    await user.type(screen.getByLabelText('Titel *'), 'Min bok');
    await user.click(screen.getByRole('button', { name: 'Spara bok' }));
    expect(screen.getByText(/Du verkar redan ha läst/)).toBeTruthy();
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Avbryt',
      }),
    );
    expect((screen.getByLabelText('Titel *') as HTMLInputElement).value).toBe(
      'Min bok',
    );
    expect(localLibrary.load()).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Spara bok' }));
    await user.click(
      screen.getByRole('button', { name: 'Visa befintlig bok' }),
    );
    await user.click(
      screen.getByRole('button', {
        name: 'Anteckningar, sparad anteckning finns',
      }),
    );
    expect(
      (
        within(screen.getByRole('dialog')).getByLabelText(
          'Egna anteckningar',
        ) as HTMLTextAreaElement
      ).value,
    ).toBe('Behåll mig');
    await user.click(screen.getByRole('button', { name: 'Stäng' }));
    await user.click(screen.getByRole('button', { name: 'Spara bok' }));
    await user.click(screen.getByRole('button', { name: 'Lägg till ändå' }));
    expect(localLibrary.load()).toHaveLength(2);
    expect(new Set(localLibrary.load().map((b) => b.id)).size).toBe(2);
  });
  it('kontrollerar även böcker som sparats i en annan flik', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Lägg till bok' }));
    await user.type(screen.getByLabelText('Titel *'), 'Min bok');
    localLibrary.save([book]);
    await user.click(screen.getByRole('button', { name: 'Spara bok' }));
    expect(
      screen.getByRole('dialog', { name: 'Finns boken redan?' }),
    ).toBeTruthy();
    expect(localLibrary.load()).toHaveLength(1);
  });
  it('skyddar utkast vid navigering och omladdning från inställningar', async () => {
    const reload = vi.fn();
    const user = userEvent.setup();
    render(<App reload={reload} />);
    await user.click(screen.getByRole('button', { name: 'Lägg till bok' }));
    await user.type(screen.getByLabelText('Titel *'), 'Utkast');
    await user.click(screen.getByRole('button', { name: 'Mitt bibliotek' }));
    expect(
      screen.getByRole('dialog', { name: 'Lämna osparade ändringar?' }),
    ).toBeTruthy();
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Avbryt',
      }),
    );
    await user.click(screen.getByRole('button', { name: 'Inställningar' }));
    await user.click(screen.getByRole('button', { name: 'Uppdatera appen' }));
    expect(reload).not.toHaveBeenCalled();
    await user.click(
      within(
        screen.getByRole('dialog', {
          name: 'Ladda om med osparade ändringar?',
        }),
      ).getByRole('button', { name: 'Avbryt' }),
    );
    await user.click(screen.getByRole('button', { name: 'Stäng' }));
    expect((screen.getByLabelText('Titel *') as HTMLInputElement).value).toBe(
      'Utkast',
    );
    await user.click(screen.getByRole('button', { name: 'Inställningar' }));
    await user.click(screen.getByRole('button', { name: 'Uppdatera appen' }));
    await user.click(screen.getByRole('button', { name: 'Ladda om ändå' }));
    expect(reload).toHaveBeenCalledOnce();
  });
  it('laddar om utan att ändra sparade böcker', async () => {
    localLibrary.save([book]);
    const before = localStorage.getItem(STORAGE_KEY);
    const reload = vi.fn();
    const user = userEvent.setup();
    render(<App reload={reload} />);
    await user.click(screen.getByRole('button', { name: 'Inställningar' }));
    await user.click(screen.getByRole('button', { name: 'Uppdatera appen' }));
    expect(reload).toHaveBeenCalledOnce();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before);
  });
  it('följer systemets ändringar och sparar manuellt tema', async () => {
    let listener: () => void = () => {};
    const media = {
      matches: false,
      addEventListener: (_name: string, fn: () => void) => {
        listener = fn;
      },
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('matchMedia', () => media);
    const user = userEvent.setup();
    const view = render(<App />);
    expect(document.documentElement.dataset.theme).toBe('light');
    media.matches = true;
    act(() => listener());
    expect(document.documentElement.dataset.theme).toBe('dark');
    await user.click(screen.getByRole('button', { name: 'Inställningar' }));
    await user.click(screen.getByRole('radio', { name: 'Ljust' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
    act(() => listener());
    expect(document.documentElement.dataset.theme).toBe('light');
    view.unmount();
    render(<App />);
    expect(document.documentElement.dataset.theme).toBe('light');
  });
  it('väljer ett äldre skottdatum genom månad och år', async () => {
    const change = vi.fn();
    const user = userEvent.setup();
    render(
      <DatePicker
        id="date"
        label="Läsdatum"
        value="2026-10-27"
        onChange={change}
      />,
    );
    await user.click(screen.getByLabelText('Läsdatum'));
    await user.click(screen.getByRole('button', { name: 'Välj månad och år' }));
    await user.click(screen.getByRole('combobox', { name: 'År' }));
    await user.click(screen.getByRole('option', { name: '2000' }));
    await user.click(screen.getByRole('combobox', { name: 'Månad' }));
    await user.click(screen.getByRole('option', { name: 'februari' }));
    const day = screen
      .getAllByRole('button')
      .find((b) => b.textContent === '29');
    expect(day).toBeTruthy();
    await user.click(day!);
    expect(change).toHaveBeenCalledWith('2000-02-29');
    expect(localDateString(parseLocalDate('2000-02-29')!)).toBe('2000-02-29');
    expect(parseLocalDate('2026-02-29')).toBeUndefined();
  });
});

it('granskar sökträffar och behåller anteckningar och betyg vid byte av bok', async () => {
  const fetchMock = vi.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          items: [
            {
              id: 'new',
              volumeInfo: {
                title: 'Hittad bok',
                authors: ['Författaren'],
                industryIdentifiers: [{ identifier: '0306406152' }],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ),
  );
  vi.stubGlobal('fetch', fetchMock);
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Lägg till bok' }));
  await user.type(screen.getByLabelText('Titel *'), 'Egen titel');
  await user.type(
    screen.getByLabelText('Egna anteckningar'),
    'Behåll anteckningen',
  );
  await user.click(screen.getByRole('radio', { name: '4 av 5 stjärnor' }));
  await user.type(screen.getByLabelText('Sök i bokdatabaser'), 'Hittad bok');
  await user.click(screen.getByRole('button', { name: 'Sök' }));
  await user.click(await screen.findByRole('button', { name: /Hittad bok/ }));
  expect(localLibrary.load()).toHaveLength(0);
  await user.click(
    screen.getByRole('button', { name: 'Använd bokuppgifterna' }),
  );
  expect((screen.getByLabelText('Titel *') as HTMLInputElement).value).toBe(
    'Hittad bok',
  );
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByLabelText('Titel *')),
  );
  expect(
    (screen.getByLabelText('Egna anteckningar') as HTMLInputElement).value,
  ).toBe('Behåll anteckningen');
  await user.click(screen.getByRole('button', { name: 'Spara bok' }));
  expect(localLibrary.load()[0]).toMatchObject({
    title: 'Hittad bok',
    notes: 'Behåll anteckningen',
    rating: 4,
    isbn: '9780306406157',
  });
});
