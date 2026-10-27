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
      className="form-actions border-t bg-card"
      role="group"
      aria-label="Spara eller avbryt bokuppgifter"
    >
      <div className="mx-auto flex min-h-[var(--form-actions-height)] max-w-2xl items-center justify-end gap-3 px-5 py-3 sm:px-7">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Avbryt
        </Button>
        <Button type="submit" form={formId} disabled={disabled}>
          <Save />
          {editing ? 'Spara ändringar' : 'Spara bok'}
        </Button>
      </div>
    </div>
  );
}
