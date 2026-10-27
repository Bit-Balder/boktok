import { useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import {
  statuses,
  validateBook,
  type Book,
  type BookInput,
  type Status,
} from '../lib/books';
import { Button } from './ui/button';
import { Field, Input, Select, Textarea } from './ui/field';
export function BookForm({
  book,
  onSave,
  onCancel,
  error,
  blocked = false,
}: {
  book?: Book;
  onSave: (input: BookInput) => void;
  onCancel: () => void;
  error: string;
  blocked?: boolean;
}) {
  const [validation, setValidation] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (key: string) => String(data.get(key) || '').trim();
    const input: BookInput = {
      title: text('title'),
      authors: text('authors')
        .split('\n')
        .map((a) => a.trim())
        .filter(Boolean),
      isbn: text('isbn') || undefined,
      coverUrl: text('coverUrl') || undefined,
      description: text('description') || undefined,
      status: text('status') as Status,
      startedAt: text('startedAt') || undefined,
      finishedAt: text('finishedAt') || undefined,
      rating: text('rating') ? Number(text('rating')) : undefined,
      notes: text('notes') || undefined,
    };
    const problem = validateBook(input);
    setValidation(problem || '');
    if (!problem) onSave(input);
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Titel *" id="title">
        <Input
          id="title"
          name="title"
          required
          maxLength={500}
          defaultValue={book?.title}
          placeholder="Vad heter boken?"
          autoFocus
        />
      </Field>
      <Field label="Författare · en per rad" id="authors">
        <Textarea
          id="authors"
          name="authors"
          className="min-h-20"
          defaultValue={book?.authors.join('\n')}
          placeholder="Författarens namn"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Lässtatus" id="status">
          <Select
            id="status"
            name="status"
            defaultValue={book?.status || 'want_to_read'}
          >
            {Object.entries(statuses).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Betyg" id="rating">
          <Select id="rating" name="rating" defaultValue={book?.rating || ''}>
            <option value="">Inget betyg</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} av 5
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Började läsa" id="startedAt">
          <Input
            type="date"
            id="startedAt"
            name="startedAt"
            defaultValue={book?.startedAt}
          />
        </Field>
        <Field label="Läste klart" id="finishedAt">
          <Input
            type="date"
            id="finishedAt"
            name="finishedAt"
            defaultValue={book?.finishedAt}
          />
        </Field>
      </div>
      <Field label="Egna anteckningar" id="notes">
        <Textarea
          id="notes"
          name="notes"
          defaultValue={book?.notes}
          placeholder="Tankar att spara till senare…"
        />
      </Field>
      <details className="rounded-md border p-4" open={book ? true : undefined}>
        <summary className="cursor-pointer text-sm font-medium">
          Fler bokuppgifter
        </summary>
        <div className="mt-4 space-y-4">
          <Field label="ISBN" id="isbn">
            <Input id="isbn" name="isbn" defaultValue={book?.isbn} />
          </Field>
          <Field label="Omslagsbild · HTTPS-adress" id="coverUrl">
            <Input
              id="coverUrl"
              name="coverUrl"
              type="url"
              defaultValue={book?.coverUrl}
              placeholder="https://…"
            />
          </Field>
          <p className="text-xs text-muted-foreground">
            Webbläsaren hämtar bilden från adressen du anger.
          </p>
          <Field label="Beskrivning" id="description">
            <Textarea
              id="description"
              name="description"
              defaultValue={book?.description}
            />
          </Field>
        </div>
      </details>
      {(validation || error) && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
        >
          {validation || error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-3 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Avbryt
        </Button>
        <Button type="submit" disabled={blocked}>
          <Save />
          {book ? 'Spara ändringar' : 'Spara bok'}
        </Button>
      </div>
    </form>
  );
}
