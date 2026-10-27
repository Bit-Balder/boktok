import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import type { Book } from '../lib/books';
import { readingStatistics, readingYears } from '../lib/statistics';
import { Select } from './ui/select';

const months = Array.from({ length: 12 }, (_, month) =>
  new Intl.DateTimeFormat('sv', { month: 'long' }).format(
    new Date(2024, month, 1),
  ),
);

export function ReadingStats({ books }: { books: Book[] }) {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const years = readingYears(books);
  const selectedYear = years.includes(year) ? year : years[0];
  const stats = readingStatistics(books, selectedYear);
  const max = Math.max(1, ...stats.months);
  return (
    <details className="mb-8 rounded-lg border bg-card p-4 sm:p-5">
      <summary className="min-h-11 cursor-pointer py-2 font-medium">
        <span className="inline-flex items-center gap-2">
          <BarChart3 className="size-5 text-primary" />
          Lässtatistik
        </span>
      </summary>
      <div className="mt-4 space-y-5">
        <Select
          label="År för lässtatistik"
          value={selectedYear}
          onValueChange={setYear}
          options={years.map((value) => ({ value, label: value }))}
        />
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-muted-foreground">
              Lästa {selectedYear}
            </dt>
            <dd className="mt-1 font-serif text-3xl">{stats.count}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Snittbetyg</dt>
            <dd className="mt-1 font-serif text-3xl">
              {stats.average === undefined
                ? '–'
                : `${stats.average.toLocaleString('sv', { maximumFractionDigits: 1 })} / 5`}
            </dd>
          </div>
        </dl>
        <table className="w-full text-sm">
          <caption className="mb-3 text-left text-muted-foreground">
            Lästa böcker per månad {selectedYear}
          </caption>
          <tbody>
            {stats.months.map((count, month) => (
              <tr key={month}>
                <th
                  scope="row"
                  className="w-24 py-1.5 text-left font-normal capitalize"
                >
                  {months[month]}
                </th>
                <td className="px-3" aria-hidden="true">
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </div>
                </td>
                <td className="w-8 text-right tabular-nums">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Statistiken använder läsdatum för böcker med status Läst. Snittbetyget
          räknar bara betygsatta böcker under valt år.
        </p>
        {stats.undated > 0 && (
          <p className="text-sm text-muted-foreground">
            {stats.undated}{' '}
            {stats.undated === 1 ? 'läst bok saknar' : 'lästa böcker saknar'}{' '}
            läsdatum och ingår inte i årsstatistiken.
          </p>
        )}
      </div>
    </details>
  );
}
