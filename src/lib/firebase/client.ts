import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  authApi: typeof import('firebase/auth');
}
export const firebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY?.trim() &&
  import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY?.trim(),
);
let services: Promise<FirebaseServices> | undefined;
export function getFirebase(): Promise<FirebaseServices> {
  if (!firebaseConfigured)
    return Promise.reject(new Error('Firebase är inte konfigurerat.'));
  if (!services) services = initialize();
  return services;
}
async function initialize(): Promise<FirebaseServices> {
  const [apps, authApi, store, check] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
    import('firebase/app-check'),
  ]);
  const app =
    apps.getApps().find((app) => app.name === 'boktok') ||
    apps.initializeApp(
      {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: 'boktok-c5e14.firebaseapp.com',
        projectId: 'boktok-c5e14',
        storageBucket: 'boktok-c5e14.firebasestorage.app',
        messagingSenderId: '27152083275',
        appId: '1:27152083275:web:efceea4325c0dfe650e0ce',
      },
      'boktok',
    );
  const emulated =
    import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS === 'true';
  if (!emulated)
    check.initializeAppCheck(app, {
      provider: new check.ReCaptchaEnterpriseProvider(
        import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY!,
      ),
      isTokenAutoRefreshEnabled: true,
    });
  const auth = authApi.getAuth(app);
  const db = store.getFirestore(app);
  if (emulated) {
    authApi.connectAuthEmulator(auth, 'http://127.0.0.1:9099', {
      disableWarnings: true,
    });
    store.connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  // Firestore uses memory only. Private books never enter guest LocalStorage.
  await authApi.setPersistence(auth, authApi.browserLocalPersistence);
  return { app, auth, db, authApi };
}
export function accountError(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : '';
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'E-postadressen eller lösenordet stämmer inte.',
    'auth/invalid-email': 'Ange en giltig e-postadress.',
    'auth/email-already-in-use':
      'Adressen har redan ett konto. Logga in eller återställ lösenordet.',
    'auth/weak-password': 'Välj ett starkare lösenord med minst sex tecken.',
    'auth/popup-closed-by-user': 'Inloggningen avbröts. Du kan försöka igen.',
    'auth/cancelled-popup-request':
      'Inloggningen avbröts. Du kan försöka igen.',
    'auth/popup-blocked':
      'Tillåt popupfönster eller logga in med e-post och lösenord.',
    'auth/account-exists-with-different-credential':
      'Kontot använder ett annat inloggningssätt. Använd det för att logga in.',
    'auth/too-many-requests':
      'För många försök. Vänta en stund och försök igen.',
    'auth/network-request-failed':
      'Kontrollera internetanslutningen och försök igen.',
    'auth/unauthorized-domain':
      'Inloggningen är inte konfigurerad för den här webbadressen.',
    'auth/operation-not-allowed':
      'Det här inloggningssättet är inte aktiverat ännu.',
  };
  return (
    messages[code] ||
    'Kunde inte ansluta till kontot. Försök igen eller fortsätt utan konto.'
  );
}
