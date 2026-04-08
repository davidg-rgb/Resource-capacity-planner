'use client';

/**
 * v5.0 — Phase 43 / Plan 43-03 Task 1 — PersonForm.
 *
 * Matches the REAL `personCreateSchema` (people.schema.ts):
 *   firstName, lastName, disciplineId, departmentId, targetHoursPerMonth
 *
 * Deviation from plan: the plan doc requested fields `name`, `email`,
 * `employmentPercentage` — none of those exist on the `people` table or in
 * `personCreateSchema`. We ship the real schema fields so the POST to
 * /api/v5/admin/registers/person actually validates server-side.
 *
 * Discipline + department selects are populated via the existing v4
 * read-only hooks (useDisciplines / useDepartments), which are explicitly
 * allowed per the plan's read_first notes (D-13 scope boundary).
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod/v4';

import { RegisterFormField } from '@/components/admin/RegisterFormField';
import { personCreateSchema } from '@/features/people/person.schema';
import { useDepartments, useDisciplines } from '@/hooks/use-reference-data';
import type { RegisterDrawerFormProps } from '@/components/admin/RegisterDrawer';
import { FormFooter } from './FormFooter';

export type PersonFormValues = {
  firstName: string;
  lastName: string;
  disciplineId: string;
  departmentId: string;
  targetHoursPerMonth: number;
  archivedAt?: Date | null;
};

export function PersonForm(props: RegisterDrawerFormProps<PersonFormValues>) {
  const { defaultValues, onSubmit, onCancel, isArchived, submitting, submitError } = props;
  const t = useTranslations('v5.admin.register');

  const { data: disciplines } = useDisciplines();
  const { data: departments } = useDepartments();

  const [firstName, setFirstName] = useState<string>((defaultValues?.firstName as string) ?? '');
  const [lastName, setLastName] = useState<string>((defaultValues?.lastName as string) ?? '');
  const [disciplineId, setDisciplineId] = useState<string>(
    (defaultValues?.disciplineId as string) ?? '',
  );
  const [departmentId, setDepartmentId] = useState<string>(
    (defaultValues?.departmentId as string) ?? '',
  );
  const [targetHoursPerMonth, setTargetHoursPerMonth] = useState<number>(
    (defaultValues?.targetHoursPerMonth as number) ?? 160,
  );
  const [errors, setErrors] = useState<Partial<Record<keyof PersonFormValues, string>>>({});

  const buildValues = (): PersonFormValues => ({
    firstName,
    lastName,
    disciplineId,
    departmentId,
    targetHoursPerMonth: Number(targetHoursPerMonth) || 0,
  });

  const handleRestore = async () => {
    await onSubmit({ ...buildValues(), archivedAt: null });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = personCreateSchema.parse(buildValues());
      setErrors({});
      await onSubmit(parsed as PersonFormValues);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const next: Partial<Record<keyof PersonFormValues, string>> = {};
        for (const issue of err.issues) {
          const key = issue.path[0] as keyof PersonFormValues;
          if (!next[key]) next[key] = issue.message;
        }
        setErrors(next);
      } else {
        throw err;
      }
    }
  };

  const disciplineOptions = (disciplines ?? []).map((d) => ({ value: d.id, label: d.name }));
  const departmentOptions = (departments ?? []).map((d) => ({ value: d.id, label: d.name }));

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4" data-testid="person-form">
      <RegisterFormField
        label={t('form.person.firstName')}
        name="firstName"
        value={firstName}
        onChange={setFirstName}
        required
        disabled={isArchived}
        autoFocus
        maxLength={100}
        error={errors.firstName}
      />
      <RegisterFormField
        label={t('form.person.lastName')}
        name="lastName"
        value={lastName}
        onChange={setLastName}
        required
        disabled={isArchived}
        maxLength={100}
        error={errors.lastName}
      />
      <RegisterFormField
        label={t('form.person.discipline')}
        name="disciplineId"
        type="select"
        value={disciplineId}
        onChange={setDisciplineId}
        required
        disabled={isArchived}
        options={disciplineOptions}
        error={errors.disciplineId}
      />
      <RegisterFormField
        label={t('form.person.department')}
        name="departmentId"
        type="select"
        value={departmentId}
        onChange={setDepartmentId}
        required
        disabled={isArchived}
        options={departmentOptions}
        error={errors.departmentId}
      />
      <RegisterFormField
        label={t('form.person.targetHoursPerMonth')}
        name="targetHoursPerMonth"
        type="number"
        value={targetHoursPerMonth}
        onChange={(v) => setTargetHoursPerMonth(Number(v))}
        required
        disabled={isArchived}
        min={1}
        max={744}
        error={errors.targetHoursPerMonth}
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
