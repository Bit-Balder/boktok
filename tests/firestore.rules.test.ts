import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  type Firestore,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { createCloudBackend } from '../src/lib/firebase/cloud';
import type { Book } from '../src/lib/books';
let env: RulesTestEnvironment;
const book: Book = {
  id: 'one',
  title: 'Min bok',
  authors: ['Anna'],
  status: 'reading',
  notes: 'Behåll mig',
  rating: 3,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};
const db = (uid?: string) =>
  uid
    ? (env.authenticatedContext(uid).firestore() as unknown as Firestore)
    : (env.unauthenticatedContext().firestore() as unknown as Firestore);
const backend = (uid: string) =>
  createCloudBackend(db(uid), { currentUser: { uid } as User }, uid);
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-boktok',
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });
});
beforeEach(async () => env.clearFirestore());
afterAll(async () => env?.cleanup());
describe('privata säkerhetsregler', () => {
  it('tillåter ägarens bokhantering och blockerar gäster', async () => {
    const alice = db('alice');
    const ref = doc(alice, 'users/alice/books/one');
    await assertSucceeds(setDoc(ref, book));
    await assertSucceeds(getDoc(ref));
    await assertSucceeds(updateDoc(ref, { rating: 5 }));
    await assertFails(getDoc(doc(db(), 'users/alice/books/one')));
    await assertFails(
      setDoc(doc(db(), 'users/alice/books/other'), { ...book, id: 'other' }),
    );
    await assertSucceeds(deleteDoc(ref));
  });
  it('blockerar läsning, listning, uppdatering och borttagning av någon annans böcker', async () => {
    await setDoc(doc(db('alice'), 'users/alice/books/one'), book);
    const bob = db('bob');
    await assertFails(getDoc(doc(bob, 'users/alice/books/one')));
    await assertFails(getDocs(collection(bob, 'users/alice/books')));
    await assertFails(
      updateDoc(doc(bob, 'users/alice/books/one'), { rating: 1 }),
    );
    await assertFails(deleteDoc(doc(bob, 'users/alice/books/one')));
    await assertFails(
      setDoc(doc(bob, 'users/alice/books/new'), { ...book, id: 'new' }),
    );
  });
  it('avvisar felaktiga bokfält och ändrat skapandedatum', async () => {
    const ref = doc(db('alice'), 'users/alice/books/one');
    for (const invalid of [
      { ...book, id: 'wrong' },
      { ...book, status: 'unknown' },
      { ...book, rating: 6 },
      { ...book, authors: ['Anna', 9] },
      { ...book, notes: 'x'.repeat(20001) },
      { ...book, admin: true },
    ])
      await assertFails(setDoc(ref, invalid));
    await setDoc(ref, book);
    await assertFails(updateDoc(ref, { createdAt: '2000-01-01T00:00:00Z' }));
  });
  it('skyddar importkvitton från andra användare och från överskrivning', async () => {
    const ref = doc(db('alice'), 'users/alice/imports/local');
    await assertSucceeds(
      setDoc(ref, {
        sourceId: 'local',
        bookId: '',
        status: 'skipped',
        createdAt: new Date().toISOString(),
      }),
    );
    await assertFails(getDoc(doc(db('bob'), 'users/alice/imports/local')));
    await assertFails(updateDoc(ref, { status: 'imported' }));
    await assertFails(deleteDoc(ref));
    await assertFails(
      setDoc(doc(db('alice'), 'users/alice/imports/missing'), {
        sourceId: 'missing',
        bookId: 'import-missing',
        status: 'imported',
        createdAt: new Date().toISOString(),
      }),
    );
  });
});
describe('molnbibliotek och import', () => {
  it('sparar privat, kontrollerar dubbletter och tillåter ett uttryckligt undantag', async () => {
    const store = backend('alice');
    expect((await store.save(book)).status).toBe('saved');
    expect((await store.save(book)).status).toBe('duplicate');
    expect((await store.save(book, undefined, true)).status).toBe('saved');
    expect(
      (await getDocs(collection(db('alice'), 'users/alice/books'))).size,
    ).toBe(2);
    expect((await getDocs(collection(db('bob'), 'users/bob/books'))).size).toBe(
      0,
    );
  });
  it('bevarar samtidiga ändringar genom transaktioner', async () => {
    const alice = db('alice');
    await setDoc(doc(alice, 'users/alice/books/one'), book);
    const store = backend('alice');
    await Promise.all([
      store.update('one', { rating: 5 }),
      store.update('one', { notes: 'Ny text' }),
    ]);
    expect(
      (await getDoc(doc(alice, 'users/alice/books/one'))).data(),
    ).toMatchObject({ rating: 5, notes: 'Ny text', title: book.title });
  });
  it('importerar samma lokala bok högst en gång och ger varje konto egna kvitton', async () => {
    const store = backend('alice');
    await store.importBook(book, 'add');
    await store.importBook(book, 'add', true);
    expect(
      (await getDocs(collection(db('alice'), 'users/alice/books'))).size,
    ).toBe(1);
    expect(await store.importPlan([book])).toEqual([]);
    expect(await backend('bob').importPlan([book])).toHaveLength(1);
    await backend('bob').importBook(book, 'add');
    expect((await getDocs(collection(db('bob'), 'users/bob/books'))).size).toBe(
      1,
    );
  });
  it('visar matchningar och minns när användaren hoppar över en bok', async () => {
    await setDoc(doc(db('alice'), 'users/alice/books/one'), book);
    const source = { ...book, id: 'local' };
    const store = backend('alice');
    expect((await store.importPlan([source]))[0].matches).toHaveLength(1);
    expect((await store.importBook(source, 'add')).status).toBe('duplicate');
    await store.importBook(source, 'skip');
    expect(await store.importPlan([source])).toEqual([]);
    expect(
      (await getDocs(collection(db('alice'), 'users/alice/books'))).size,
    ).toBe(1);
  });
  it('stoppar skrivning när kontot har bytts', async () => {
    const store = createCloudBackend(
      db('alice'),
      { currentUser: { uid: 'bob' } as User },
      'alice',
    );
    await expect(store.save(book)).rejects.toThrow('Kontot');
    expect(
      (await getDocs(collection(db('alice'), 'users/alice/books'))).size,
    ).toBe(0);
  });
});
