import { Save } from 'lucide-react';
import { Button } from './button';
export function FormActions({
  formId,
  editing,
  disabled,
  onCancel,
}: {
  formId: string;
  editing: boolean;
  disabled: boolean;
  onCancel: () => void;
}) {
  return (
    <div
      className="form-actions pointer-events-none"
      role="group"
      aria-label="Spara eller avbryt bokuppgifter"
    >
      <div className="mx-auto flex min-h-[var(--form-actions-height)] max-w-2xl items-center justify-center gap-3 px-4 py-3">
        <Button
          type="button"
          variant="outline"
          className="pointer-events-auto min-h-11 rounded-full border-border bg-card px-4 shadow-lg"
          onClick={onCancel}
        >
          Avbryt
        </Button>
        <Button
          type="submit"
          form={formId}
          disabled={disabled}
          className="pointer-events-auto min-h-14 min-w-40 rounded-full px-5 shadow-lg"
        >
          <Save />
          {editing ? 'Spara ändringar' : 'Spara bok'}
        </Button>
      </div>
    </div>
  );
}
