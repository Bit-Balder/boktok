import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useCloudLibrary } from '../src/hooks/useCloudLibrary';
import { localLibrary, STORAGE_KEY } from '../src/lib/storage';
import type { CloudBackend } from '../src/lib/firebase/cloud';
import type { Book } from '../src/lib/books';
const local: Book = {
  id: 'local',
  title: 'Lokalt',
  authors: [],
  status: 'reading',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};
function fake() {
  let emit: (books: Book[]) => void = () => {};
  const stop = vi.fn();
  const service: CloudBackend = {
    watch: vi.fn((callback) => {
      emit = callback;
      callback([]);
      return stop;
    }),
    save: vi.fn().mockResolvedValue({ status: 'saved' }),
    update: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    importPlan: vi.fn().mockResolvedValue([{ book: local, matches: [] }]),
    importBook: vi.fn().mockResolvedValue({ status: 'saved' }),
  };
  return {
    service,
    connect: vi.fn().mockResolvedValue(service),
    emit: (books: Book[]) => emit(books),
    stop,
  };
}
beforeEach(() => {
  localStorage.clear();
  localLibrary.save([local]);
});
afterEach(cleanup);
describe('molnbibliotekets tillstånd', () => {
  it('håller molnböcker borta från gästlagringen och stänger prenumerationen', async () => {
    const server = fake();
    const before = localStorage.getItem(STORAGE_KEY);
    const hook = renderHook(() => useCloudLibrary('alice', server.connect));
    await waitFor(() => expect(hook.result.current.blocked).toBe(false));
    act(() => server.emit([{ ...local, id: 'cloud', title: 'Privat' }]));
    expect(hook.result.current.books[0].title).toBe('Privat');
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before);
    hook.unmount();
    expect(server.stop).toHaveBeenCalledOnce();
    act(() => server.emit([{ ...local, title: 'Gammal session' }]));
    const next = renderHook(() => useCloudLibrary('bob', server.connect));
    expect(next.result.current.books).toEqual([]);
  });
  it('låser samtidiga skrivningar och väntar på lyckad sparning', async () => {
    const server = fake();
    let finish: () => void = () => {};
    server.service.update = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const hook = renderHook(() => useCloudLibrary('alice', server.connect));
    await waitFor(() => expect(hook.result.current.blocked).toBe(false));
    let first: Promise<boolean>;
    act(() => {
      first = hook.result.current.update('cloud', { rating: 5 });
    });
    expect(hook.result.current.pending).toBe(true);
    expect(await hook.result.current.update('cloud', { rating: 1 })).toBe(
      false,
    );
    expect(server.service.update).toHaveBeenCalledOnce();
    await act(async () => {
      finish();
      expect(await first!).toBe(true);
    });
    expect(hook.result.current.pending).toBe(false);
  });
  it('behåller lokala böcker vid både lyckad och misslyckad import', async () => {
    const server = fake();
    const before = localStorage.getItem(STORAGE_KEY);
    const hook = renderHook(() => useCloudLibrary('alice', server.connect));
    await waitFor(() =>
      expect(hook.result.current.imports.items).toHaveLength(1),
    );
    server.service.importBook = vi.fn().mockRejectedValue(new Error('offline'));
    await act(async () => {
      await hook.result.current.imports.run(
        { book: local, matches: [] },
        'add',
      );
    });
    expect(hook.result.current.imports.items).toHaveLength(1);
    expect(hook.result.current.imports.error).toBeTruthy();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before);
    server.service.importBook = vi.fn().mockResolvedValue({ status: 'saved' });
    await act(async () => {
      await hook.result.current.imports.run(
        { book: local, matches: [] },
        'add',
      );
    });
    expect(hook.result.current.imports.items).toHaveLength(0);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before);
  });
  it('kräver ny granskning när lokala böcker ändras före import', async () => {
    const server = fake();
    const hook = renderHook(() => useCloudLibrary('alice', server.connect));
    await waitFor(() =>
      expect(hook.result.current.imports.items).toHaveLength(1),
    );
    localLibrary.save([{ ...local, title: 'Ny lokal titel' }]);
    await act(async () => {
      await hook.result.current.imports.run(
        { book: local, matches: [] },
        'add',
      );
    });
    expect(server.service.importBook).not.toHaveBeenCalled();
    expect(hook.result.current.imports.error).toContain('ändrats lokalt');
    expect(localLibrary.load()[0].title).toBe('Ny lokal titel');
  });
  it('visar nya dubbletter före import och behåller boken för nytt val', async () => {
    const server = fake();
    server.service.importBook = vi.fn().mockResolvedValue({
      status: 'duplicate',
      matches: [{ book: { ...local, id: 'existing' }, reason: 'title' }],
    });
    const hook = renderHook(() => useCloudLibrary('alice', server.connect));
    await waitFor(() =>
      expect(hook.result.current.imports.items).toHaveLength(1),
    );
    await act(async () => {
      await hook.result.current.imports.run(
        { book: local, matches: [] },
        'add',
      );
    });
    expect(hook.result.current.imports.items[0].matches).toHaveLength(1);
    expect(localLibrary.load()).toEqual([local]);
  });
  it('faller aldrig tillbaka till gästbiblioteket när molnet inte kan läsas', async () => {
    const connect = vi.fn().mockRejectedValue(new Error('denied'));
    const hook = renderHook(() => useCloudLibrary('alice', connect));
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    expect(hook.result.current.blocked).toBe(true);
    expect(hook.result.current.books).toEqual([]);
    expect(await hook.result.current.update('one', { rating: 3 })).toBe(false);
    expect(localLibrary.load()).toEqual([local]);
  });
});
