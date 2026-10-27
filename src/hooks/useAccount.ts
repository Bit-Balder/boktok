import { useEffect, useRef, useState } from 'react';
import {
  accountError,
  firebaseConfigured,
  getFirebase,
} from '../lib/firebase/client';
export interface AccountUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}
export function useAccount() {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [ready, setReady] = useState(!firebaseConfigured);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  useEffect(() => {
    if (!firebaseConfigured) return;
    let stopped = false;
    let unsubscribe: (() => void) | undefined;
    void getFirebase()
      .then(({ auth, authApi }) => {
        if (stopped) return;
        unsubscribe = authApi.onAuthStateChanged(
          auth,
          (current) => {
            if (stopped) return;
            setUser(
              current
                ? {
                    uid: current.uid,
                    email: current.email,
                    displayName: current.displayName,
                  }
                : null,
            );
            setReady(true);
            setError('');
          },
          () => {
            if (!stopped) {
              setError(
                'Kontot kunde inte läsas. Ladda om sidan och försök igen.',
              );
              setReady(true);
            }
          },
        );
      })
      .catch((error) => {
        if (!stopped) {
          setError(accountError(error));
          setReady(true);
        }
      });
    return () => {
      stopped = true;
      unsubscribe?.();
    };
  }, []);
  async function action(
    run: (
      services: Awaited<ReturnType<typeof getFirebase>>,
    ) => Promise<unknown>,
  ): Promise<boolean> {
    if (busy.current) return false;
    busy.current = true;
    setPending(true);
    setError('');
    try {
      await run(await getFirebase());
      return true;
    } catch (error) {
      setError(accountError(error));
      return false;
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return {
    user,
    ready,
    pending,
    error,
    configured: firebaseConfigured,
    login: (email: string, password: string) =>
      action(({ auth, authApi }) =>
        authApi.signInWithEmailAndPassword(auth, email, password),
      ),
    register: (email: string, password: string) =>
      action(({ auth, authApi }) =>
        authApi.createUserWithEmailAndPassword(auth, email, password),
      ),
    google: () =>
      action(({ auth, authApi }) => {
        const provider = new authApi.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        return authApi.signInWithPopup(auth, provider);
      }),
    logout: () => action(({ auth, authApi }) => authApi.signOut(auth)),
    reset: (email: string) =>
      action(({ auth, authApi }) =>
        authApi.sendPasswordResetEmail(auth, email),
      ),
  };
}
export type AccountController = ReturnType<typeof useAccount>;
