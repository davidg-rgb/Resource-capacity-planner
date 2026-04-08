'use client';

/**
 * v5.0 — Phase 43 / Plan 43-03 Task 1 — ProgramForm.
 * Fields: name, description (textarea).
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod/v4';

import { RegisterFormField } from '@/components/admin/RegisterFormField';
import { programCreateSchema } from '@/features/programs/program.schema';
import type { RegisterDrawerFormProps } from '@/components/admin/RegisterDrawer';
import { FormFooter } from './FormFooter';

export type ProgramFormValues = {
  name: string;
  description?: string;
  archivedAt?: Date | null;
};

export function ProgramForm(props: RegisterDrawerFormProps<ProgramFormValues>) {
  const { defaultValues, onSubmit, onCancel, isArchived, submitting, submitError } = props;
  const t = useTranslations('v5.admin.register');

  const [name, setName] = useState<string>((defaultValues?.name as string) ?? '');
  const [description, setDescription] = useState<string>(
    (defaultValues?.description as string) ?? '',
  );
  const [errors, setErrors] = useState<Partial<Record<keyof ProgramFormValues, string>>>({});

  const handleRestore = async () => {
    await onSubmit({ name, description: description || undefined, archivedAt: null });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = programCreateSchema.parse({
        name,
        description: description || undefined,
      });
      setErrors({});
      await onSubmit(parsed as ProgramFormValues);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const next: Partial<Record<keyof ProgramFormValues, string>> = {};
        for (const issue of err.issues) {
          const key = issue.path[0] as keyof ProgramFormValues;
          if (!next[key]) next[key] = issue.message;
        }
        setErrors(next);
      } else {
        throw err;
      }
    }
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4" data-testid="program-form">
      <RegisterFormField
        label={t('form.program.name')}
        name="name"
        value={name}
        onChange={setName}
        required
        disabled={isArchived}
        autoFocus
        error={errors.name}
      />
      <RegisterFormField
        label={t('form.program.description')}
        name="description"
        type="textarea"
        value={description}
        onChange={setDescription}
        disabled={isArchived}
        maxLength={500}
        rows={4}
        error={errors.description}
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
