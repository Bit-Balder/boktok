import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LibraryView } from '../src/components/LibraryView';
import type { Book } from '../src/lib/books';

function library(size: number): Book[] {
  return Array.from({ length: size }, (_, index) => ({
    id: String(index + 1),
    title: `Bok ${String(index + 1).padStart(3, '0')}`,
    authors: ['Anna'],
    status: index % 2 ? 'reading' : 'finished',
    finishedAt: index % 2 ? undefined : '2025-12-01',
    rating: index >= 40 ? 5 : 2,
    notes: index >= 40 ? 'En anteckning' : '',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  }));
}
const defaults = { blocked: false, error: '', notice: '', onOpen: vi.fn() };
const cards = () => screen.queryAllByRole('button', { name: /^Visa Bok / });
async function choose(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  option: string,
) {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(screen.getByRole('option', { name: option }));
}
afterEach(cleanup);

describe('visa fler böcker', () => {
  it('visar 20, sedan 40 och till sist 45 böcker utan dubbletter', async () => {
    const user = userEvent.setup();
    render(<LibraryView {...defaults} books={library(45)} />);
    expect(cards()).toHaveLength(20);
    expect(screen.getByText('Visar 20 av 45 böcker')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Alla böcker 45' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Visa fler' }));
    expect(cards()).toHaveLength(40);
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Visa Bok 021' }),
    );
    await user.click(screen.getByRole('button', { name: 'Visa fler' }));
    expect(cards()).toHaveLength(45);
    expect(screen.getByText('Visar 45 av 45 böcker')).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Visa Bok 041' }),
    );
    expect(screen.queryByRole('button', { name: 'Visa fler' })).toBeNull();
  });
  it.each([0, 1, 20])('visar ingen Visa fler-knapp för %i böcker', (size) => {
    render(<LibraryView {...defaults} books={library(size)} />);
    expect(cards()).toHaveLength(size);
    expect(screen.queryByRole('button', { name: 'Visa fler' })).toBeNull();
  });
  it('filtrerar hela biblioteket före uppdelningen och börjar om vid ändrade filter', async () => {
    const user = userEvent.setup();
    render(<LibraryView {...defaults} books={library(65)} />);
    await user.click(screen.getByRole('button', { name: 'Visa fler' }));
    await choose(user, 'Filtrera på anteckningar', 'Med anteckning');
    expect(cards()).toHaveLength(20);
    expect(screen.getByText('Visar 20 av 25 böcker')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Visa Bok 041' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Visa fler' }));
    await choose(user, 'Filtrera på stjärnbetyg', 'Minst 4 stjärnor');
    expect(cards()).toHaveLength(20);
    await user.click(screen.getByRole('button', { name: 'Visa fler' }));
    expect(cards()).toHaveLength(25);
    await user.type(screen.getByRole('searchbox'), 'Bok 06');
    expect(cards()).toHaveLength(6);
    expect(screen.getByRole('button', { name: 'Visa Bok 065' })).toBeTruthy();
    await user.click(
      screen.getByRole('button', { name: 'Rensa sökning och filter' }),
    );
    expect(cards()).toHaveLength(20);
    expect(screen.getByText('Visar 20 av 65 böcker')).toBeTruthy();
  });
  it('sorterar hela biblioteket och återställer antalet vid status- och årsbyte', async () => {
    const user = userEvent.setup();
    render(<LibraryView {...defaults} books={library(65)} />);
    await user.click(screen.getByRole('button', { name: 'Visa fler' }));
    await choose(user, 'Sortera böcker', 'Högst betyg');
    expect(cards()).toHaveLength(20);
    expect(cards()[0].getAttribute('aria-label')).toBe('Visa Bok 041');
    await user.click(screen.getByRole('button', { name: 'Visa fler' }));
    await user.click(screen.getByRole('button', { name: 'Läser 32' }));
    expect(cards()).toHaveLength(20);
    expect(screen.getByText('Visar 20 av 32 böcker')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Alla böcker 65' }));
    await user.click(screen.getByRole('button', { name: 'Visa fler' }));
    await choose(user, 'Filtrera på läsår', 'Lästa 2025');
    expect(cards()).toHaveLength(20);
    expect(screen.getByText('Visar 20 av 33 böcker')).toBeTruthy();
  });
  it('bevarar visade böcker vid synkning och hanterar borttagning', async () => {
    const user = userEvent.setup();
    const books = library(45);
    const { rerender } = render(<LibraryView {...defaults} books={books} />);
    await user.click(screen.getByRole('button', { name: 'Visa fler' }));
    rerender(
      <LibraryView
        {...defaults}
        books={[
          ...books,
          ...library(1).map((book) => ({
            ...book,
            id: 'extra',
            title: 'Ny bok',
          })),
        ]}
      />,
    );
    expect(cards()).toHaveLength(40);
    expect(screen.getByText('Visar 40 av 46 böcker')).toBeTruthy();
    rerender(<LibraryView {...defaults} books={books.slice(0, 5)} />);
    expect(cards()).toHaveLength(5);
    expect(screen.getByText('Visar 5 av 5 böcker')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Visa fler' })).toBeNull();
  });
});
