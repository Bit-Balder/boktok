import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { STORAGE_KEY } from '../src/lib/storage';
beforeEach(() => localStorage.clear());
afterEach(cleanup);
describe('bibliotekets huvudflöde', () => {
  it('lägger till, bevarar efter omladdning, redigerar och tar bort en bok', async () => {
    const user = userEvent.setup();
    const view = render(<App />);
    await user.click(
      screen.getByRole('button', { name: 'Lägg till din första bok' }),
    );
    await user.type(screen.getByLabelText('Titel *'), 'Min bok');
    await user.type(
      screen.getByLabelText('Författare · en per rad'),
      'Anna Andersson',
    );
    await user.selectOptions(screen.getByLabelText('Lässtatus'), 'reading');
    await user.click(screen.getByRole('button', { name: 'Spara bok' }));
    expect(screen.getByRole('button', { name: 'Visa Min bok' })).toBeTruthy();
    view.unmount();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Visa Min bok' }));
    await user.click(screen.getByRole('button', { name: 'Redigera bok' }));
    await user.selectOptions(screen.getByLabelText('Lässtatus'), 'finished');
    await user.click(screen.getByRole('button', { name: 'Spara ändringar' }));
    expect(
      within(screen.getByRole('button', { name: 'Visa Min bok' })).getByText(
        'Läst',
      ),
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Visa Min bok' }));
    await user.click(screen.getByRole('button', { name: 'Ta bort' }));
    await user.click(screen.getByRole('button', { name: 'Avbryt' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Ta bort' }));
    await user.click(screen.getByRole('button', { name: 'Ta bort bok' }));
    expect(screen.queryByRole('button', { name: 'Visa Min bok' })).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).books).toEqual([]);
  });
  it('behåller formuläret vid sparfel', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getByRole('button', { name: 'Lägg till din första bok' }),
    );
    await user.type(screen.getByLabelText('Titel *'), 'Osparad bok');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Fullt');
    });
    await user.click(screen.getByRole('button', { name: 'Spara bok' }));
    expect((screen.getByLabelText('Titel *') as HTMLInputElement).value).toBe(
      'Osparad bok',
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
  it('skyddar oläsbar lagring', () => {
    localStorage.setItem(STORAGE_KEY, 'trasig data');
    render(<App />);
    expect(screen.getByRole('alert').textContent).toContain('kunde inte läsas');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('trasig data');
  });
});
