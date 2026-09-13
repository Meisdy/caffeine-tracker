import { useId } from 'react';
import type { ChangeEvent } from 'react';

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
}

export function NumberField({ label, value, onChange, unit, min, max, step = 1 }: NumberFieldProps) {
  const inputId = useId();

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = Number(event.target.value);
    // An in-progress edit (e.g. a lone "-" or empty string) parses to NaN; ignore
    // it rather than propagating a bad number, and let the input keep the text.
    if (Number.isNaN(nextValue)) return;
    onChange(nextValue);
  }

  return (
    <label className="number-field" htmlFor={inputId}>
      <span className="number-field-label">{label}</span>
      <span className="number-field-control">
        <input
          id={inputId}
          type="number"
          inputMode="decimal"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={handleChange}
        />
        {unit ? <span className="number-field-unit">{unit}</span> : null}
      </span>
    </label>
  );
}
