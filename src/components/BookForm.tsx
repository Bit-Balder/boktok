import { useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import {
  statuses,
  validateBook,
  type BookInput,
  type Status,
} from '../lib/books';
import { Button } from './ui/button';
import { Field, Input, Textarea } from './ui/field';
import { Select } from './ui/select';
import { DatePicker } from './ui/date-picker';
import { Rating } from './ui/rating';
export function BookForm({
  draft,
  onChange,
  onSave,
  onCancel,
  error,
  editing,
  blocked = false,
}: {
  draft: BookInput;
  onChange: (input: BookInput) => void;
  onSave: (input: BookInput) => void;
  onCancel: () => void;
  error: string;
  editing: boolean;
  blocked?: boolean;
}) {
  const [validation, setValidation] = useState('');
  function patch(update: Partial<BookInput>) {
    onChange({ ...draft, ...update });
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = {
      ...draft,
      title: draft.title.trim(),
      authors: draft.authors.map((a) => a.trim()).filter(Boolean),
      isbn: draft.isbn?.trim() || undefined,
      coverUrl: draft.coverUrl?.trim() || undefined,
    };
    const problem = validateBook(input);
    setValidation(problem || '');
    if (!problem) onSave(input);
  }
  return (
    <form aria-label="Bokuppgifter" onSubmit={submit} className="space-y-6">
      <Field label="Titel *" id="title">
        <Input
          id="title"
          required
          maxLength={500}
          value={draft.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="Vad heter boken?"
        />
      </Field>
      <Field label="Författare · en per rad" id="authors">
        <Textarea
          id="authors"
          className="min-h-20"
          value={draft.authors.join('\n')}
          onChange={(e) => patch({ authors: e.target.value.split('\n') })}
          placeholder="Författarens namn"
        />
      </Field>
      <Field label="Lässtatus" id="status">
        <Select
          id="status"
          label="Lässtatus"
          value={draft.status}
          onValueChange={(value) => patch({ status: value as Status })}
          options={Object.entries(statuses).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </Field>
      <Rating value={draft.rating} onChange={(rating) => patch({ rating })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <DatePicker
          id="startedAt"
          label="Började läsa"
          value={draft.startedAt}
          onChange={(startedAt) => patch({ startedAt })}
        />
        <DatePicker
          id="finishedAt"
          label="Läste klart"
          value={draft.finishedAt}
          onChange={(finishedAt) => patch({ finishedAt })}
        />
      </div>
      <Field label="Egna anteckningar" id="notes">
        <Textarea
          id="notes"
          value={draft.notes || ''}
          onChange={(e) => patch({ notes: e.target.value })}
          placeholder="Tankar att spara till senare…"
        />
      </Field>
      <details
        className="rounded-md border p-4"
        open={editing || Boolean(draft.isbn || draft.coverUrl) || undefined}
      >
        <summary className="min-h-8 cursor-pointer py-1 text-sm font-medium">
          Fler bokuppgifter
        </summary>
        <div className="mt-4 space-y-4">
          <Field label="ISBN" id="isbn">
            <Input
              id="isbn"
              value={draft.isbn || ''}
              onChange={(e) => patch({ isbn: e.target.value })}
            />
          </Field>
          <Field label="Omslagsbild · HTTPS-adress" id="coverUrl">
            <Input
              id="coverUrl"
              type="url"
              value={draft.coverUrl || ''}
              onChange={(e) => patch({ coverUrl: e.target.value })}
              placeholder="https://…"
            />
          </Field>
          <p className="text-xs text-muted-foreground">
            Webbläsaren hämtar bilden från adressen du anger.
          </p>
          <Field label="Beskrivning" id="description">
            <Textarea
              id="description"
              value={draft.description || ''}
              onChange={(e) => patch({ description: e.target.value })}
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
      <div className="flex flex-wrap justify-end gap-3 border-t pt-5">
        <Button type="button" variant="outline" onClick={onCancel}>
          Avbryt
        </Button>
        <Button type="submit" disabled={blocked}>
          <Save />
          {editing ? 'Spara ändringar' : 'Spara bok'}
        </Button>
      </div>
    </form>
  );
}
