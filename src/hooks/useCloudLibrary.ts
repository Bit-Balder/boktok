import { useEffect, useRef, useState } from 'react';
import type { Book, BookInput } from '../lib/books';
import type { BookChange } from '../lib/bookChanges';
import type {
  CloudBackend,
  ImportItem,
  SaveResult,
} from '../lib/firebase/cloud';
import { localLibrary } from '../lib/storage';
import { getFirebase } from '../lib/firebase/client';
export async function connectCloud(uid: string) {
  const [{ createCloudBackend }, services] = await Promise.all([
    import('../lib/firebase/cloud'),
    getFirebase(),
  ]);
  return createCloudBackend(services.db, services.auth, uid);
}
export function useCloudLibrary(uid: string, connect = connectCloud) {
  const [books, setBooks] = useState<Book[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [healthy, setHealthy] = useState(false);
  const [pending, setPending] = useState(false);
  const [plan, setPlan] = useState<ImportItem[]>([]);
  const [importError, setImportError] = useState('');
  const [importLoading, setImportLoading] = useState(true);
  const [importNotice, setImportNotice] = useState('');
  const backend = useRef<CloudBackend | null>(null);
  const active = useRef(false);
  const locked = useRef(false);
  useEffect(() => {
    active.current = true;
    let stopped = false;
    let unsubscribe: (() => void) | undefined;
    const timer = setTimeout(() => {
      if (!stopped) {
        setLoading(false);
        setError(
          'Molnbiblioteket kunde inte hämtas. Kontrollera anslutningen och ladda om sidan.',
        );
      }
    }, 15000);
    void connect(uid)
      .then((service) => {
        if (stopped) return;
        backend.current = service;
        unsubscribe = service.watch(
          (next) => {
            if (stopped) return;
            clearTimeout(timer);
            setBooks(next);
            setLoading(false);
            setHealthy(true);
            setError('');
          },
          () => {
            if (!stopped) {
              clearTimeout(timer);
              setLoading(false);
              setHealthy(false);
              setError(
                'Molnbiblioteket kunde inte läsas. Kontrollera anslutningen eller kontots behörighet.',
              );
            }
          },
        );
        return service
          .importPlan(localLibrary.load())
          .then((items) => {
            if (!stopped) {
              setPlan(items);
              setImportLoading(false);
            }
          })
          .catch(() => {
            if (!stopped) {
              setImportLoading(false);
              setImportError(
                'Lokala böcker kunde inte förberedas för import. De har inte ändrats.',
              );
            }
          });
      })
      .catch(() => {
        if (!stopped) {
          clearTimeout(timer);
          setLoading(false);
          setImportLoading(false);
          setError(
            'Molnbiblioteket kunde inte anslutas. Ladda om sidan och försök igen.',
          );
        }
      });
    return () => {
      stopped = true;
      active.current = false;
      clearTimeout(timer);
      unsubscribe?.();
      backend.current = null;
    };
  }, [uid, connect]);
  async function mutate<T>(
    run: (service: CloudBackend) => Promise<T>,
    fallback: T,
  ): Promise<T> {
    if (locked.current || !backend.current || !healthy) return fallback;
    locked.current = true;
    setPending(true);
    setError('');
    try {
      return await run(backend.current);
    } catch {
      if (active.current)
        setError(
          'Kunde inte spara i molnbiblioteket. Kontrollera anslutningen och försök igen.',
        );
      return fallback;
    } finally {
      locked.current = false;
      if (active.current) setPending(false);
    }
  }
  async function importOne(
    item: ImportItem,
    decision: 'add' | 'skip',
    force = false,
  ) {
    setImportError('');
    try {
      const latest = localLibrary
        .load()
        .find((book) => book.id === item.book.id);
      if (!latest || JSON.stringify(latest) !== JSON.stringify(item.book)) {
        if (backend.current)
          setPlan(await backend.current.importPlan(localLibrary.load()));
        setImportError('Boken har ändrats lokalt. Granska importen igen.');
        return;
      }
    } catch {
      setImportError('Lokala böcker kunde inte läsas. De har inte ändrats.');
      return;
    }
    const result = await mutate(
      (service) => service.importBook(item.book, decision, force),
      { status: 'error' } as SaveResult,
    );
    if (!active.current) return;
    if (result.status === 'duplicate') {
      setPlan((current) =>
        current.map((entry) =>
          entry.book.id === item.book.id
            ? { ...entry, matches: result.matches }
            : entry,
        ),
      );
      setImportError(
        'En matchande bok har tillkommit. Granska träffen och välj igen.',
      );
      return;
    }
    if (result.status === 'saved') {
      setPlan((current) =>
        current.filter((entry) => entry.book.id !== item.book.id),
      );
      setImportNotice(
        decision === 'add'
          ? 'Boken har importerats.'
          : 'Boken har hoppats över.',
      );
    } else
      setImportError(
        'Importen kunde inte slutföras. Dina lokala böcker finns kvar.',
      );
  }
  return {
    books,
    error,
    loading,
    pending,
    blocked: loading || !healthy,
    save: (input: BookInput, id?: string, allowDuplicate = false) =>
      mutate((service) => service.save(input, id, allowDuplicate), {
        status: 'error',
      } as SaveResult),
    update: (id: string, change: BookChange) =>
      mutate(async (service) => {
        await service.update(id, change);
        return true;
      }, false),
    remove: (id: string) =>
      mutate(async (service) => {
        await service.remove(id);
        return true;
      }, false),
    imports: {
      items: plan,
      loading: importLoading,
      error: importError,
      notice: importNotice,
      run: importOne,
    },
  };
}
export type CloudLibrary = ReturnType<typeof useCloudLibrary>;
