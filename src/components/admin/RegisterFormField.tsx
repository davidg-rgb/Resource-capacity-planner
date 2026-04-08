'use client';

/**
 * v5.0 — Phase 43 / Plan 43-02: shared form-field primitive.
 *
 * Text / number / date / textarea / select variants sharing one
 * label + error layout, so per-entity forms in 43-03 stay tiny.
 * Uses native HTML inputs + repo-standard tailwind tokens
 * (bg-surface, border-outline-variant) — no new component lib.
 */

import type { ChangeEvent, ReactNode } from 'react';

export type RegisterFieldType = 'text' | 'number' | 'date' | 'textarea' | 'select';

export interface RegisterFieldOption {
  value: string;
  label: string;
}

export interface RegisterFormFieldProps {
  label: string;
  name: string;
  type?: RegisterFieldType;
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  error?: string | null;
  options?: readonly RegisterFieldOption[];
  rows?: number;
  min?: number;
  max?: number;
  maxLength?: number;
  autoFocus?: boolean;
  hint?: ReactNode;
}

const INPUT_CLS =
  'border-outline-variant/30 bg-surface text-on-surface focus:ring-primary w-full rounded-sm border px-3 py-2 text-sm focus:ring-1 focus:outline-none disabled:opacity-60';

export function RegisterFormField(props: RegisterFormFieldProps) {
  const {
    label,
    name,
    type = 'text',
    value,
    onChange,
    required,
    disabled,
    placeholder,
    error,
    options,
    rows,
    min,
    max,
    maxLength,
    autoFocus,
    hint,
  } = props;

  const id = `register-field-${name}`;
  const stringValue = value === null || value === undefined ? '' : String(value);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => onChange(e.target.value);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-on-surface-variant text-xs font-medium">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          id={id}
          name={name}
          value={stringValue}
          onChange={handleChange}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          rows={rows ?? 3}
          maxLength={maxLength}
          autoFocus={autoFocus}
          className={INPUT_CLS}
        />
      ) : type === 'select' ? (
        <select
          id={id}
          name={name}
          value={stringValue}
          onChange={handleChange}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          className={INPUT_CLS}
        >
          {!required && <option value=""></option>}
          {(options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          value={stringValue}
          onChange={handleChange}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          min={min}
          max={max}
          maxLength={maxLength}
          autoFocus={autoFocus}
          className={INPUT_CLS}
        />
      )}
      {hint && <p className="text-on-surface-variant text-xs">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
