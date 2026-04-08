'use client';

/**
 * v5.0 — Phase 43 / Plan 43-03 Task 1 — DisciplineForm.
 * Fields: name, abbreviation (D-17: no color column in schema).
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod/v4';

import { RegisterFormField } from '@/components/admin/RegisterFormField';
import { disciplineCreateSchema } from '@/features/disciplines/discipline.schema';
import type { RegisterDrawerFormProps } from '@/components/admin/RegisterDrawer';
import { FormFooter } from './FormFooter';

export type DisciplineFormValues = {
  name: string;
  abbreviation: string;
  archivedAt?: Date | null;
};

export function DisciplineForm(props: RegisterDrawerFormProps<DisciplineFormValues>) {
  const { defaultValues, onSubmit, onCancel, isArchived, submitting, submitError } = props;
  const t = useTranslations('v5.admin.register');

  const [name, setName] = useState<string>((defaultValues?.name as string) ?? '');
  const [abbreviation, setAbbreviation] = useState<string>(
    (defaultValues?.abbreviation as string) ?? '',
  );
  const [errors, setErrors] = useState<Partial<Record<keyof DisciplineFormValues, string>>>({});

  const handleRestore = async () => {
    await onSubmit({ name, abbreviation, archivedAt: null });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = disciplineCreateSchema.parse({ name, abbreviation });
      setErrors({});
      await onSubmit(parsed as DisciplineFormValues);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const next: Partial<Record<keyof DisciplineFormValues, string>> = {};
        for (const issue of err.issues) {
          const key = issue.path[0] as keyof DisciplineFormValues;
          if (!next[key]) next[key] = issue.message;
        }
        setErrors(next);
      } else {
        throw err;
      }
    }
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4" data-testid="discipline-form">
      <RegisterFormField
        label={t('form.discipline.name')}
        name="name"
        value={name}
        onChange={setName}
        required
        disabled={isArchived}
        autoFocus
        error={errors.name}
      />
      <RegisterFormField
        label={t('form.discipline.abbreviation')}
        name="abbreviation"
        value={abbreviation}
        onChange={setAbbreviation}
        required
        disabled={isArchived}
        maxLength={10}
        error={errors.abbreviation}
      />
      {submitError && (
        <p role="alert" className="text-xs text-red-600">
          {submitError}
        </p>
      )}
      <FormFooter
        isArchived={isArchived}
        submitting={submitting}
        onCancel={onCancel}
        onRestore={handleRestore}
      />
    </form>
  );
}
