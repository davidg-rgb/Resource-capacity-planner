'use client';

/**
 * v5.0 — Phase 43 / Plan 43-03 Task 1 — ProjectForm.
 *
 * Matches the REAL `projectCreateSchema` (project.schema.ts):
 *   name, programId (nullable), status ('active' | 'planned')
 *
 * Deviation from plan: the plan doc requested `code`, `leadPmPersonId`,
 * `startDate`, `endDate` — none of those are in `projectCreateSchema`.
 * `leadPmPersonId` exists as a column but is owned by PROP-02 assignment
 * flows, not the admin register create/edit flow. We ship the real schema
 * fields so POST validates server-side; extending the schema is out of
 * scope for 43-03 (touches v4 surfaces + PROP-02 contract).
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod/v4';

import { RegisterFormField } from '@/components/admin/RegisterFormField';
import { projectCreateSchema } from '@/features/projects/project.schema';
import { usePrograms } from '@/hooks/use-reference-data';
import type { RegisterDrawerFormProps } from '@/components/admin/RegisterDrawer';
import { FormFooter } from './FormFooter';

export type ProjectFormValues = {
  name: string;
  programId?: string | null;
  status: 'active' | 'planned';
  archivedAt?: Date | null;
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'active' },
  { value: 'planned', label: 'planned' },
];

export function ProjectForm(props: RegisterDrawerFormProps<ProjectFormValues>) {
  const { defaultValues, onSubmit, onCancel, isArchived, submitting, submitError } = props;
  const t = useTranslations('v5.admin.register');

  const { data: programs } = usePrograms();

  const [name, setName] = useState<string>((defaultValues?.name as string) ?? '');
  const [programId, setProgramId] = useState<string>((defaultValues?.programId as string) ?? '');
  const [status, setStatus] = useState<'active' | 'planned'>(
    (defaultValues?.status as 'active' | 'planned') ?? 'active',
  );
  const [errors, setErrors] = useState<Partial<Record<keyof ProjectFormValues, string>>>({});

  const buildValues = (): ProjectFormValues => ({
    name,
    programId: programId || null,
    status,
  });

  const handleRestore = async () => {
    await onSubmit({ ...buildValues(), archivedAt: null });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = projectCreateSchema.parse(buildValues());
      setErrors({});
      await onSubmit(parsed as ProjectFormValues);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const next: Partial<Record<keyof ProjectFormValues, string>> = {};
        for (const issue of err.issues) {
          const key = issue.path[0] as keyof ProjectFormValues;
          if (!next[key]) next[key] = issue.message;
        }
        setErrors(next);
      } else {
        throw err;
      }
    }
  };

  const programOptions = (programs ?? []).map((p) => ({ value: p.id, label: p.name }));

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4" data-testid="project-form">
      <RegisterFormField
        label={t('form.project.name')}
        name="name"
        value={name}
        onChange={setName}
        required
        disabled={isArchived}
        autoFocus
        maxLength={200}
        error={errors.name}
      />
      <RegisterFormField
        label={t('form.project.program')}
        name="programId"
        type="select"
        value={programId}
        onChange={setProgramId}
        disabled={isArchived}
        options={programOptions}
        error={errors.programId}
      />
      <RegisterFormField
        label={t('form.project.status')}
        name="status"
        type="select"
        value={status}
        onChange={(v) => setStatus(v as 'active' | 'planned')}
        required
        disabled={isArchived}
        options={STATUS_OPTIONS}
        error={errors.status}
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
