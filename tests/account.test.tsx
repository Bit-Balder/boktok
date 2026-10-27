import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useAccount } from '../src/hooks/useAccount';
import { accountError } from '../src/lib/firebase/client';
const mock = vi.hoisted(() => ({
  observer: null as
    | null
    | ((
        user: { uid: string; email: string; displayName: null } | null,
      ) => void),
  stop: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  google: vi.fn(),
  logout: vi.fn(),
  reset: vi.fn(),
}));
vi.mock('../src/lib/firebase/client', async (importOriginal) => {
  const real =
    await importOriginal<typeof import('../src/lib/firebase/client')>();
  return {
    ...real,
    firebaseConfigured: true,
    getFirebase: vi.fn().mockResolvedValue({
      auth: {},
      authApi: {
        onAuthStateChanged: vi.fn((_auth, callback) => {
          mock.observer = callback;
          callback(null);
          return mock.stop;
        }),
        signInWithEmailAndPassword: mock.login,
        createUserWithEmailAndPassword: mock.register,
        signInWithPopup: mock.google,
        signOut: mock.logout,
        sendPasswordResetEmail: mock.reset,
        GoogleAuthProvider: class {
          setCustomParameters = vi.fn();
        },
      },
    }),
  };
});
beforeEach(() => {
  for (const fn of [
    mock.login,
    mock.register,
    mock.google,
    mock.logout,
    mock.reset,
  ])
    fn.mockReset().mockResolvedValue({});
  mock.stop.mockClear();
});
afterEach(cleanup);
it('återställer kontot och erbjuder e-post, Google, registrering och lösenordsåterställning', async () => {
  const hook = renderHook(useAccount);
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  await act(async () => {
    expect(await hook.result.current.login('a@example.com', 'password')).toBe(
      true,
    );
  });
  expect(mock.login).toHaveBeenCalledWith({}, 'a@example.com', 'password');
  await act(async () => {
    await hook.result.current.register('a@example.com', 'password');
    await hook.result.current.google();
    await hook.result.current.reset('a@example.com');
  });
  expect(mock.register).toHaveBeenCalledOnce();
  expect(mock.google).toHaveBeenCalledOnce();
  expect(mock.reset).toHaveBeenCalledWith({}, 'a@example.com');
  act(() =>
    mock.observer?.({
      uid: 'alice',
      email: 'a@example.com',
      displayName: null,
    }),
  );
  expect(hook.result.current.user?.uid).toBe('alice');
  await act(async () => {
    await hook.result.current.logout();
    mock.observer?.(null);
  });
  expect(hook.result.current.user).toBeNull();
  hook.unmount();
  expect(mock.stop).toHaveBeenCalledOnce();
});
it('visar begripliga fel och skyddar mot dubbla inloggningsförsök', async () => {
  const hook = renderHook(useAccount);
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  let reject: (error: unknown) => void = () => {};
  mock.login.mockImplementation(
    () =>
      new Promise((_resolve, no) => {
        reject = no;
      }),
  );
  let first: Promise<boolean>;
  act(() => {
    first = hook.result.current.login('a@example.com', 'wrong');
  });
  await waitFor(() => expect(mock.login).toHaveBeenCalledOnce());
  expect(await hook.result.current.google()).toBe(false);
  await act(async () => {
    reject({ code: 'auth/invalid-credential', message: 'raw secret error' });
    expect(await first!).toBe(false);
  });
  expect(hook.result.current.error).toBe(
    'E-postadressen eller lösenordet stämmer inte.',
  );
  expect(hook.result.current.pending).toBe(false);
  expect(accountError({ code: 'unknown', message: 'secret' })).not.toContain(
    'secret',
  );
});
