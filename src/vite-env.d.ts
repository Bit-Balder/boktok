/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_GOOGLE_BOOKS_API_KEY?: string;
}

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_APPCHECK_SITE_KEY?: string;
  readonly VITE_FIREBASE_EMULATORS?: string;
}
