'use client';

/**
 * v5.0 — Phase 43 / Plan 43-02: generic create/edit drawer for admin
 * registers. Wraps the shared `Drawer` chrome and renders a per-entity
 * `formComponent` prop that 43-03 will supply (PersonForm, ProjectForm, ...).
 *
 * The form component is responsible for rendering its own submit / cancel
 * footer so that each entity can have different validation + fields.
 *
 * When `isArchived` is true, the form is expected to render in read-only
 * mode except for the "Återställ" (un-archive) action.
 */

import type { ComponentType } from 'react';

import { Drawer } from '@/components/drawer/Drawer';

export interface RegisterDrawerFormProps<TValues> {
  defaultValues: Partial<TValues> | null;
  onSubmit: (values: TValues) => void | Promise<void>;
  onCancel: () => void;
  isArchived: boolean;
  submitting: boolean;
  submitError: string | null;
}

export interface RegisterDrawerProps<TValues> {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel?: string;
  formComponent: ComponentType<RegisterDrawerFormProps<TValues>>;
  defaultValues: Partial<TValues> | null;
  onSubmit: (values: TValues) => void | Promise<void>;
  isArchived?: boolean;
  submitting?: boolean;
  submitError?: string | null;
}

export function RegisterDrawer<TValues>(props: RegisterDrawerProps<TValues>) {
  const {
    open,
    onClose,
    title,
    closeLabel,
    formComponent: FormComponent,
    defaultValues,
    onSubmit,
    isArchived = false,
    submitting = false,
    submitError = null,
  } = props;

  return (
    <Drawer open={open} onClose={onClose} title={title} closeLabel={closeLabel}>
      <div data-testid="register-drawer-body">
        <FormComponent
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          onCancel={onClose}
          isArchived={isArchived}
          submitting={submitting}
          submitError={submitError}
        />
      </div>
    </Drawer>
  );
}
