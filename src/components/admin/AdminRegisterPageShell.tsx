'use client';

/**
 * v5.0 — Phase 43 / Plan 43-03 Task 2.
 *
 * Shared per-entity admin register page shell. Each of the five
 * per-entity pages (/admin/people, /admin/projects, /admin/departments,
 * /admin/disciplines, /admin/programs) mounts this with its own:
 *   - RegisterEntity key
 *   - column config
 *   - form component
 * and gets: Clerk org:admin gate + PersonaGate(['admin']) wrap + the
 * full RegisterTable + RegisterDrawer wiring including the
 * DEPENDENT_ROWS_EXIST blocker banner.
 */

import { useAuth } from '@clerk/nextjs';
import { ShieldAlert } from 'lucide-react';
import { useState, type ComponentType } from 'react';
import { useTranslations } from 'next-intl';

import {
  DependentRowsError,
  useArchiveRegisterRow,
  useCreateRegisterRow,
  useRegisterList,
  useUpdateRegisterRow,
  type RegisterEntity,
} from '@/hooks/use-admin-registers';
import { PersonaGate } from '@/features/personas/persona-route-guard';
import {
  RegisterTable,
  type RegisterRowLike,
  type RegisterTableBanner,
  type RegisterTableColumn,
} from './RegisterTable';
import { RegisterDrawer, type RegisterDrawerFormProps } from './RegisterDrawer';

// ---------------------------------------------------------------------------
// Dependent-row blocker → i18n string helper
// ---------------------------------------------------------------------------

export function useBlockerFormatter() {
  const t = useTranslations('v5.admin.register.dependentRowsExist');
  return (blockers: Record<string, number>): string => {
    const parts: string[] = [];
    for (const [key, count] of Object.entries(blockers)) {
      if (!count) continue;
      // Narrow to known keys; fall back to generic `key: count` for unknowns.
      const knownKeys = ['allocations', 'proposals', 'people', 'projects', 'leadPm'] as const;
      if ((knownKeys as readonly string[]).includes(key)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parts.push(t(key as (typeof knownKeys)[number], { count } as any));
      } else {
        parts.push(`${key}: ${count}`);
      }
    }
    return `${t('title')} ${parts.join(', ')}`;
  };
}

// ---------------------------------------------------------------------------

export interface AdminRegisterPageShellProps<TRow extends RegisterRowLike, TValues> {
  entity: RegisterEntity;
  titleKey:
    | 'title.person'
    | 'title.project'
    | 'title.department'
    | 'title.discipline'
    | 'title.program';
  descriptionKey:
    | 'description.person'
    | 'description.project'
    | 'description.department'
    | 'description.discipline'
    | 'description.program';
  columns: ReadonlyArray<RegisterTableColumn<TRow>>;
  formComponent: ComponentType<RegisterDrawerFormProps<TValues>>;
  /** Test hook — when provided, page renders without Clerk gate check. */
  skipClerkGate?: boolean;
}

export function AdminRegisterPageShell<TRow extends RegisterRowLike, TValues>(
  props: AdminRegisterPageShellProps<TRow, TValues>,
) {
  const { orgRole } = useAuth();
  const isClerkAdmin =
    props.skipClerkGate === true || orgRole === 'org:admin' || orgRole === 'org:owner';
  const t = useTranslations('v5.admin.register');

  if (!isClerkAdmin) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 py-20"
        data-testid="admin-register-forbidden"
      >
        <ShieldAlert size={48} className="text-outline" />
        <h2 className="font-headline text-on-surface text-lg font-semibold">Access Denied</h2>
        <p className="text-on-surface-variant text-sm">{t('forbidden')}</p>
      </div>
    );
  }

  return (
    <PersonaGate allowed={['admin']}>
      <AdminRegisterInner {...props} />
    </PersonaGate>
  );
}

function AdminRegisterInner<TRow extends RegisterRowLike, TValues>(
  props: AdminRegisterPageShellProps<TRow, TValues>,
) {
  const { entity, titleKey, descriptionKey, columns, formComponent } = props;
  const t = useTranslations('v5.admin.register');
  const formatBlockers = useBlockerFormatter();

  const [includeArchived, setIncludeArchived] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<TRow | null>(null);
  const [banner, setBanner] = useState<RegisterTableBanner | null>(null);

  const list = useRegisterList(entity, { includeArchived });
  const createMut = useCreateRegisterRow(entity);
  const updateMut = useUpdateRegisterRow(entity);
  const archiveMut = useArchiveRegisterRow(entity);

  const labels = {
    newButton: t('new'),
    showArchived: t('showArchived'),
    edit: t('edit'),
    archive: t('archive'),
    unarchive: t('unarchive'),
    archiveConfirm: (name: string) => t('archiveConfirm', { name }),
    empty: t('empty'),
    addFirst: t('addFirst'),
    loading: t('loading'),
    errorTitle: t('errorTitle'),
    retry: t('retry'),
    actionsColumn: t('actionsColumn'),
    archivedBadge: t('archivedBadge'),
  };

  const handleArchive = async (row: TRow) => {
    try {
      await archiveMut.mutateAsync(row.id as string);
      setBanner(null);
    } catch (err) {
      if (err instanceof DependentRowsError) {
        setBanner({
          tone: 'error',
          message: formatBlockers(err.blockers),
          onDismiss: () => setBanner(null),
        });
      } else {
        setBanner({
          tone: 'error',
          message: t('saveError'),
          onDismiss: () => setBanner(null),
        });
      }
    }
  };

  const handleSubmit = async (values: TValues) => {
    if (editingRow) {
      await updateMut.mutateAsync({
        id: editingRow.id as string,
        data: values as Record<string, unknown>,
      });
    } else {
      await createMut.mutateAsync(values as Record<string, unknown>);
    }
    setDrawerOpen(false);
    setEditingRow(null);
  };

  return (
    <>
      <RegisterTable<TRow>
        title={t(titleKey)}
        description={t(descriptionKey)}
        columns={columns}
        rows={(list.data ?? []) as readonly TRow[]}
        isLoading={list.isLoading}
        error={list.error as Error | null}
        onRetry={() => void list.refetch()}
        includeArchived={includeArchived}
        onToggleArchived={setIncludeArchived}
        onCreate={() => {
          setEditingRow(null);
          setDrawerOpen(true);
        }}
        onEdit={(row) => {
          setEditingRow(row);
          setDrawerOpen(true);
        }}
        onArchive={handleArchive}
        onUnarchive={(row) => {
          setEditingRow(row);
          setDrawerOpen(true);
        }}
        banner={banner}
        labels={labels}
      />
      <RegisterDrawer<TValues>
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingRow(null);
        }}
        title={editingRow ? t('edit') : t('new')}
        closeLabel={t('closeLabel')}
        formComponent={formComponent}
        defaultValues={(editingRow as unknown as Partial<TValues>) ?? null}
        isArchived={!!(editingRow as { archivedAt?: unknown } | null)?.archivedAt}
        submitting={createMut.isPending || updateMut.isPending}
        submitError={null}
        onSubmit={handleSubmit}
      />
    </>
  );
}
