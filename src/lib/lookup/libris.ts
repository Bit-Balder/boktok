import { normalize } from '../books';
import { canonicalIsbn } from '../isbn';
import type { BookResult, SearchMode } from './index';

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
const list = (value: unknown): unknown[] =>
  value == null ? [] : Array.isArray(value) ? value : [value];
const text = (value: unknown): string =>
  typeof value === 'string'
    ? value.trim()
    : Array.isArray(value)
      ? value.map(text).filter(Boolean).join(' ')
      : '';
const isType = (value: unknown, type: string) =>
  list(record(value)['@type']).includes(type);

export function librisParams(query: string, mode: SearchMode) {
  const params = new URLSearchParams({ '@type': 'Instance', _limit: '40' });
  if (mode === 'isbn') {
    const isbn = canonicalIsbn(query);
    if (!isbn) throw new Error('Ange ett giltigt ISBN-10 eller ISBN-13.');
    params.append('identifiedBy.value', isbn);
    // Older records may only contain ISBN-10. Multiple values are OR filters in Libris.
    if (isbn.startsWith('978')) {
      const stem = isbn.slice(3, 12);
      const sum = [...stem].reduce(
        (total, digit, index) => total + Number(digit) * (10 - index),
        0,
      );
      const check = (11 - (sum % 11)) % 11;
      params.append('identifiedBy.value', stem + (check === 10 ? 'X' : check));
    }
  } else if (mode === 'title') {
    params.set('hasTitle._str', query.trim());
  } else if (mode === 'author') {
    params.set('or-instanceOf.contribution.agent._str', query.trim());
    params.set('or-contribution.agent._str', query.trim());
  } else params.set('q', query.trim());
  return params;
}

function authors(info: Record<string, unknown>, work: Record<string, unknown>) {
  const contributions = [
    ...list(work.contribution),
    ...list(info.contribution),
  ].map(record);
  return [
    ...new Set(
      contributions.flatMap((contribution) => {
        const roles = list(contribution.role).map(record);
        const author = roles.some(
          (role) =>
            role.code === 'aut' || /\/(aut|author)$/.test(text(role['@id'])),
        );
        if (
          !author &&
          !isType(contribution, 'PrimaryContribution') &&
          roles.length
        )
          return [];
        const agent = record(contribution.agent);
        const name =
          [text(agent.givenName), text(agent.familyName)]
            .filter(Boolean)
            .join(' ') ||
          text(agent.name) ||
          text(agent.label);
        return name ? [name] : [];
      }),
    ),
  ];
}

function imageUrl(info: Record<string, unknown>) {
  for (const image of list(info.image)) {
    const object = record(image);
    const candidates = [
      typeof image === 'string' ? image : object['@id'],
      ...list(object.sameAs).map((value) => record(value)['@id']),
    ];
    for (const candidate of candidates) {
      if (!text(candidate)) continue;
      try {
        const url = new URL(text(candidate), 'https://libris.kb.se');
        if (url.protocol === 'https:') return url.href;
      } catch {
        /* Ignore malformed image addresses. */
      }
    }
  }
  return undefined;
}

export function normalizeLibris(
  payload: unknown,
  query: string,
  mode: SearchMode,
): BookResult[] {
  const seen = new Set<string>();
  const searchedIsbn = mode === 'isbn' ? canonicalIsbn(query) : undefined;
  if (mode === 'isbn' && !searchedIsbn) return [];
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return list(record(payload).items)
    .flatMap((item): BookResult[] => {
      const raw = record(item);
      // Defensive handling for holdings and record wrappers, even though the query selects Instances.
      const info = isType(raw, 'Item')
        ? record(raw.itemOf)
        : isType(raw, 'Record')
          ? record(raw.mainEntity)
          : raw;
      if (
        ['Work', 'Person', 'Organization', 'Library', 'Monograph'].some(
          (type) => isType(info, type),
        )
      )
        return [];
      const work = record(info.instanceOf);
      const titleObject =
        list(info.hasTitle).find((value) => isType(value, 'Title')) ||
        list(info.hasTitle)[0];
      const heading = record(titleObject);
      const title = [text(heading.mainTitle), text(heading.subtitle)]
        .filter(Boolean)
        .join(' : ');
      if (!title) return [];
      const ids = list(info.identifiedBy)
        .filter((value) => isType(value, 'ISBN'))
        .map((value) => canonicalIsbn(text(record(value).value)))
        .filter((value): value is string => Boolean(value));
      // A free-text ISBN match may refer to a related edition. Only accept this edition's ISBNs.
      if (searchedIsbn && !ids.includes(searchedIsbn)) return [];
      const names = authors(info, work);
      const field =
        mode === 'title'
          ? title
          : mode === 'author'
            ? names.join(' ')
            : undefined;
      if (
        field !== undefined &&
        !terms.every((term) => normalize(field).includes(term))
      )
        return [];
      const id =
        text(info['@id']) || `${title}|${names.join('|')}|${ids.join('|')}`;
      if (seen.has(id)) return [];
      seen.add(id);
      const summary = [
        ...list(info.summary),
        ...list(work.summary),
        ...list(info.hasSummary),
        ...list(work.hasSummary),
      ]
        .map((value) => text(value) || text(record(value).label))
        .filter(Boolean)
        .join('\n');
      return [
        {
          key: `libris:${id}`,
          source: 'Libris',
          book: {
            title,
            authors: names,
            isbn: searchedIsbn || ids[0],
            coverUrl: imageUrl(info),
            description: summary || undefined,
            status: 'want_to_read',
          },
        },
      ];
    })
    .slice(0, 12);
}
