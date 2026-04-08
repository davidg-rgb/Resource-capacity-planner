'use client';

/**
 * v5.0 — Phase 43 / Plan 43-03 Task 1 — DepartmentForm.
 * Single field (name). Validates via departmentCreateSchema.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod/v4';

import { RegisterFormField } from '@/components/admin/RegisterFormField';
import { departmentCreateSchema } from '@/features/admin/register.schema';
import type { RegisterDrawerFormProps } from '@/components/admin/RegisterDrawer';
import { FormFooter } from './FormFooter';

export type DepartmentFormValues = {
  name: string;
  archivedAt?: Date | null;
};

export function DepartmentForm(props: RegisterDrawerFormProps<DepartmentFormValues>) {
  const { defaultValues, onSubmit, onCancel, isArchived, submitting, submitError } = props;
  const t = useTranslations('v5.admin.register');

  const [name, setName] = useState<string>((defaultValues?.name as string) ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleRestore = async () => {
    await onSubmit({ name, archivedAt: null });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = departmentCreateSchema.parse({ name });
      setError(null);
      await onSubmit(parsed as DepartmentFormValues);
    } catch (err) {
      if (err instanceof z.ZodError) setError(err.issues[0]?.message ?? 'Invalid input');
      else throw err;
    }
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4" data-testid="department-form">
      <RegisterFormField
        label={t('form.department.name')}
        name="name"
        value={name}
        onChange={setName}
        required
        disabled={isArchived}
        autoFocus
        error={error}
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
