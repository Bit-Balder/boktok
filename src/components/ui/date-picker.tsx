import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { DayPicker } from 'react-day-picker';
import { sv } from 'react-day-picker/locale';
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from './button';
import { Select } from './select';
import { parseLocalDate, localDateString } from '../../lib/dates';
export function DatePicker({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value?: string;
  onChange: (value: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [month, setMonth] = useState(() => parseLocalDate(value) || new Date());
  const selected = parseLocalDate(value);
  const currentYear = new Date().getFullYear();
  const minYear = Math.min(1900, selected?.getFullYear() ?? 1900);
  const maxYear = Math.max(
    currentYear + 10,
    selected?.getFullYear() ?? currentYear,
  );
  function changeMonth(year: number, month: number) {
    setMonth(new Date(year, month, 1));
  }
  function select(date: Date | undefined) {
    onChange(date ? localDateString(date) : undefined);
    setOpen(false);
  }
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) {
            setMonth(selected || new Date());
            setChoosing(false);
          }
        }}
      >
        <Popover.Trigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className="min-h-12 w-full justify-start font-normal"
          >
            <CalendarDays />
            {selected
              ? selected.toLocaleDateString('sv-SE', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : 'Välj datum'}
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            aria-label={`Kalender: ${label}`}
            sideOffset={8}
            collisionPadding={8}
            align="start"
            className="z-[70] w-[min(20rem,calc(100vw-1rem))] max-h-[min(32rem,var(--radix-popover-content-available-height))] overflow-y-auto rounded-lg border bg-card p-3 text-foreground shadow-xl"
          >
            <div className="mb-3 flex items-center justify-between gap-1">
              <Button
                type="button"
                variant="ghost"
                aria-label="Föregående månad"
                disabled={
                  month.getFullYear() === minYear && month.getMonth() === 0
                }
                onClick={() =>
                  changeMonth(month.getFullYear(), month.getMonth() - 1)
                }
                className="px-3"
              >
                <ChevronLeft />
              </Button>
              <Button
                type="button"
                variant="ghost"
                aria-expanded={choosing}
                aria-label="Välj månad och år"
                onClick={() => setChoosing(!choosing)}
                className="capitalize"
              >
                {month.toLocaleDateString('sv-SE', {
                  month: 'long',
                  year: 'numeric',
                })}
                <ChevronDown />
              </Button>
              <Button
                type="button"
                variant="ghost"
                aria-label="Nästa månad"
                disabled={
                  month.getFullYear() === maxYear && month.getMonth() === 11
                }
                onClick={() =>
                  changeMonth(month.getFullYear(), month.getMonth() + 1)
                }
                className="px-3"
              >
                <ChevronRight />
              </Button>
            </div>
            {choosing && (
              <div className="mb-4 grid grid-cols-2 gap-2 border-b pb-4">
                <Select
                  label="Månad"
                  value={String(month.getMonth())}
                  onValueChange={(value) =>
                    changeMonth(month.getFullYear(), Number(value))
                  }
                  options={Array.from({ length: 12 }, (_, i) => ({
                    value: String(i),
                    label: new Date(2020, i, 1).toLocaleDateString('sv-SE', {
                      month: 'long',
                    }),
                  }))}
                />
                <Select
                  label="År"
                  value={String(month.getFullYear())}
                  onValueChange={(value) =>
                    changeMonth(Number(value), month.getMonth())
                  }
                  options={Array.from(
                    { length: maxYear - minYear + 1 },
                    (_, i) => ({
                      value: String(maxYear - i),
                      label: String(maxYear - i),
                    }),
                  )}
                />
              </div>
            )}
            <DayPicker
              mode="single"
              locale={sv}
              month={month}
              onMonthChange={setMonth}
              selected={selected}
              onSelect={select}
              startMonth={new Date(minYear, 0)}
              endMonth={new Date(maxYear, 11)}
              hideNavigation
              showOutsideDays
              fixedWeeks
              autoFocus
              className="boktok-calendar"
              classNames={{ month_caption: 'hidden' }}
            />
            <div className="mt-3 flex justify-between border-t pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => select(new Date())}
              >
                Idag
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={!value}
                onClick={() => select(undefined)}
              >
                Rensa datum
              </Button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
