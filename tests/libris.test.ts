import { afterEach, describe, expect, it, vi } from 'vitest';
import { librisParams, normalizeLibris } from '../src/lib/lookup/libris';
import {
  normalizeGoogle,
  normalizeOpenLibrary,
  providers,
  searchBooks,
} from '../src/lib/lookup';
const isbn = '9781618901224';
const item = {
  '@type': 'DigitalResource',
  '@id': 'https://libris.kb.se/book#it',
  hasTitle: [
    {
      '@type': 'Title',
      mainTitle: "Bilbo's journey",
      subtitle: 'Discovering the hidden meaning of the hobbit',
    },
  ],
  identifiedBy: [{ '@type': 'ISBN', value: '1618901222' }],
  instanceOf: {
    '@type': 'Monograph',
    contribution: [
      {
        '@type': 'PrimaryContribution',
        agent: { givenName: 'Joseph', familyName: 'Pearce' },
      },
      { role: { code: 'trl' }, agent: { name: 'Översättaren' } },
    ],
    summary: [{ label: ['En beskrivning'] }],
  },
  image: [{ '@id': 'https://libris.kb.se/dataset/images/cover.jpg' }],
};
const google = {
  items: [
    {
      id: 'g',
      volumeInfo: {
        title: 'En bok',
        industryIdentifiers: [{ identifier: isbn }],
      },
    },
  ],
};
const open = { docs: [{ key: '/works/one', title: 'En bok', isbn: [isbn] }] };
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('Libris bokuppgifter', () => {
  it('hämtar titel, författare, bild, sammanfattning och motsvarande ISBN-13', () => {
    const [result] = normalizeLibris({ items: [item] }, isbn, 'isbn');
    expect(result).toMatchObject({
      source: 'Libris',
      book: {
        title: "Bilbo's journey : Discovering the hidden meaning of the hobbit",
        authors: ['Joseph Pearce'],
        isbn,
        coverUrl: 'https://libris.kb.se/dataset/images/cover.jpg',
        description: 'En beskrivning',
      },
    });
  });
  it('jämför endast utgåvans ISBN och tar inte ISBN från relaterade verk', () => {
    const wrong = {
      ...item,
      identifiedBy: [{ '@type': 'ISBN', value: '9780306406157' }],
      instanceOf: {
        ...item.instanceOf,
        identifiedBy: [{ '@type': 'ISBN', value: isbn }],
      },
    };
    expect(normalizeLibris({ items: [wrong] }, isbn, 'isbn')).toEqual([]);
    expect(normalizeLibris({ items: [item] }, '1234', 'isbn')).toEqual([]);
  });
  it('hanterar exemplarposter, enstaka objekt, dubbletter och saknade fält', () => {
    const single = {
      ...item,
      hasTitle: { mainTitle: 'Boken' },
      identifiedBy: { '@type': 'ISBN', value: isbn },
      image: { sameAs: [{ '@id': 'https://example.com/cover.jpg' }] },
    };
    const results = normalizeLibris(
      {
        items: [
          { '@type': 'Item', itemOf: single },
          single,
          null,
          {},
          { ...item, '@type': 'Work' },
        ],
      },
      isbn,
      'isbn',
    );
    expect(results).toHaveLength(1);
    expect(results[0].book.title).toBe('Boken');
    expect(normalizeLibris({}, 'Bok', 'all')).toEqual([]);
  });
  it('skiljer titel från författare och accepterar bokuppgifter utan ISBN', () => {
    const without = {
      ...item,
      identifiedBy: [],
      image: [{ '@id': 'javascript:alert(1)' }],
    };
    expect(
      normalizeLibris({ items: [without] }, 'bilbo', 'title'),
    ).toHaveLength(1);
    expect(
      normalizeLibris({ items: [without] }, 'Joseph Pearce', 'author'),
    ).toHaveLength(1);
    expect(normalizeLibris({ items: [without] }, 'Pearce', 'title')).toEqual(
      [],
    );
    expect(normalizeLibris({ items: [without] }, 'Bilbo', 'author')).toEqual(
      [],
    );
    expect(
      normalizeLibris({ items: [without] }, 'Bilbo', 'all')[0].book,
    ).toMatchObject({ isbn: undefined, coverUrl: undefined });
  });
  it('skickar exakt ISBN-13 och ISBN-10 utan fritext eller nyckel', () => {
    const params = librisParams(isbn, 'isbn');
    expect(params.getAll('identifiedBy.value')).toEqual([isbn, '1618901222']);
    expect(params.get('@type')).toBe('Instance');
    expect(params.has('q')).toBe(false);
    expect(params.has('key')).toBe(false);
    expect(
      librisParams('9791090636071', 'isbn').getAll('identifiedBy.value'),
    ).toHaveLength(1);
    expect(() => librisParams('123', 'isbn')).toThrow();
  });
  it('avgränsar titel och författare på servern', () => {
    expect(librisParams('Bilbo', 'title').get('hasTitle._str')).toBe('Bilbo');
    const params = librisParams('Åsa Larsson', 'author');
    expect(params.get('or-instanceOf.contribution.agent._str')).toBe(
      'Åsa Larsson',
    );
    expect(params.get('or-contribution.agent._str')).toBe('Åsa Larsson');
    expect(params.has('q')).toBe(false);
    expect(librisParams('Bilbo Tolkien', 'all').get('q')).toBe('Bilbo Tolkien');
  });
  it('avvisar fel ISBN även hos reservkällorna', () => {
    expect(normalizeGoogle(google, '9780306406157')).toEqual([]);
    expect(normalizeOpenLibrary(open, '9780306406157')).toEqual([]);
  });
});

describe('Libris först och reservkällor', () => {
  function mockResponses(payloads: unknown[]) {
    const calls = vi.fn();
    for (const payload of payloads)
      calls.mockResolvedValueOnce(
        new Response(JSON.stringify(payload), { status: 200 }),
      );
    vi.stubGlobal('fetch', calls);
    return calls;
  }
  it('stannar vid en träff i Libris och skickar bara sökparametrar', async () => {
    const calls = mockResponses([{ items: [item] }]);
    const result = await searchBooks(
      isbn,
      'isbn',
      new AbortController().signal,
    );
    expect(result.results[0].source).toBe('Libris');
    expect(calls).toHaveBeenCalledOnce();
    const [address, options] = calls.mock.calls[0];
    expect(new URL(address).hostname).toBe('libris.kb.se');
    expect(options.headers.Accept).toBe('application/ld+json');
    expect(options.credentials).toBe('omit');
    expect([...new URL(address).searchParams.keys()].sort()).toEqual([
      '@type',
      '_limit',
      'identifiedBy.value',
      'identifiedBy.value',
    ]);
  });
  it('provar Google efter tomt eller felaktigt ISBN-resultat från Libris', async () => {
    const calls = mockResponses([
      { items: [{ ...item, identifiedBy: [] }] },
      google,
    ]);
    const result = await searchBooks(
      isbn,
      'isbn',
      new AbortController().signal,
    );
    expect(result.results[0].source).toBe('Google Books');
    expect(calls).toHaveBeenCalledTimes(2);
    expect(new URL(calls.mock.calls[1][0]).hostname).toBe('www.googleapis.com');
  });
  it('provar Open Library sist när de två första saknar träffar', async () => {
    const calls = mockResponses([{}, {}, open]);
    const result = await searchBooks(
      isbn,
      'isbn',
      new AbortController().signal,
    );
    expect(providers.map((source) => source.name)).toEqual([
      'Libris',
      'Google Books',
      'Open Library',
    ]);
    expect(result.results[0].source).toBe('Open Library');
    expect(calls).toHaveBeenCalledTimes(3);
  });
  it('går vidare vid Libris-fel och avbryter utan att fråga nästa källa', async () => {
    const calls = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(google), { status: 200 }),
      );
    vi.stubGlobal('fetch', calls);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(
      (await searchBooks(isbn, 'isbn', new AbortController().signal)).results[0]
        .source,
    ).toBe('Google Books');
    calls.mockReset();
    const controller = new AbortController();
    calls.mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () =>
            reject(new DOMException('Avbruten', 'AbortError')),
          );
        }),
    );
    const request = searchBooks(isbn, 'isbn', controller.signal);
    controller.abort();
    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
    expect(calls).toHaveBeenCalledOnce();
  });
  it('går vidare när Libris når tidsgränsen', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const next = vi.fn().mockResolvedValue(normalizeGoogle(google, isbn));
    const request = searchBooks(isbn, 'isbn', new AbortController().signal, [
      {
        name: 'Libris',
        search: (_query, _mode, signal) =>
          new Promise((_resolve, reject) =>
            signal.addEventListener('abort', () =>
              reject(new DOMException('', 'AbortError')),
            ),
          ),
      },
      { name: 'Google Books', search: next },
    ]);
    await vi.advanceTimersByTimeAsync(8000);
    expect((await request).results[0].source).toBe('Google Books');
    expect(next).toHaveBeenCalledOnce();
  });
});
