/**
 * v5.0 typed message-key catalog (FOUND-V5-05).
 *
 * Single source of truth for every user-facing string referenced in
 * ARCHITECTURE §6.13–§6.18, §11.1, and §11.4. Every key here MUST exist
 * in both src/messages/sv.json and src/messages/en.json under the `v5.*`
 * namespace; parity is enforced by `keys.test.ts`.
 */

export const K = {
  v5: {
    persona: {
      label: 'persona.label',
      kind: {
        pm: 'persona.kind.pm',
        'line-manager': 'persona.kind.line-manager',
        staff: 'persona.kind.staff',
        rd: 'persona.kind.rd',
        admin: 'persona.kind.admin',
      },
    },
    timeline: {
      historic: {
        dialogTitle: 'timeline.historic.dialogTitle',
        dialogBody: 'timeline.historic.dialogBody',
        confirm: 'timeline.historic.confirm',
        cancel: 'timeline.historic.cancel',
      },
      cell: {
        emDash: 'timeline.cell.emDash',
        pendingBadge: 'timeline.cell.pendingBadge',
        planActualSeparator: 'timeline.cell.planActualSeparator',
      },
    },
    approval: {
      approve: 'approval.approve',
      reject: 'approval.reject',
      rejectReasonPlaceholder: 'approval.rejectReasonPlaceholder',
      counterPropose: 'approval.counterPropose',
      impactCurrent: 'approval.impactCurrent',
      impactProjected: 'approval.impactProjected',
    },
    cell: {
      planned: 'cell.planned',
      actual: 'cell.actual',
      delta: 'cell.delta',
      noActual: 'cell.noActual',
      overBy: 'cell.overBy',
      underBy: 'cell.underBy',
      onPlan: 'cell.onPlan',
      hoursSuffix: 'cell.hoursSuffix',
    },
    drawer: {
      title: 'drawer.title',
      empty: 'drawer.empty',
      loading: 'drawer.loading',
      error: 'drawer.error',
      planColumn: 'drawer.planColumn',
      actualColumn: 'drawer.actualColumn',
      dayColumn: 'drawer.dayColumn',
      dateColumn: 'drawer.dateColumn',
      plannedColumn: 'drawer.plannedColumn',
      deltaColumn: 'drawer.deltaColumn',
      close: 'drawer.close',
    },
    screens: {
      pmHome: {
        empty: 'screens.pmHome.empty',
        loading: 'screens.pmHome.loading',
        error: 'screens.pmHome.error',
        retry: 'screens.pmHome.retry',
      },
      pmTimeline: {
        empty: 'screens.pmTimeline.empty',
        loading: 'screens.pmTimeline.loading',
        error: 'screens.pmTimeline.error',
        retry: 'screens.pmTimeline.retry',
      },
      myWishes: {
        empty: 'screens.myWishes.empty',
        loading: 'screens.myWishes.loading',
        error: 'screens.myWishes.error',
        retry: 'screens.myWishes.retry',
      },
      lineMgrHeatmap: {
        empty: 'screens.lineMgrHeatmap.empty',
        loading: 'screens.lineMgrHeatmap.loading',
        error: 'screens.lineMgrHeatmap.error',
        retry: 'screens.lineMgrHeatmap.retry',
      },
      lineMgrTimeline: {
        empty: 'screens.lineMgrTimeline.empty',
        loading: 'screens.lineMgrTimeline.loading',
        error: 'screens.lineMgrTimeline.error',
        retry: 'screens.lineMgrTimeline.retry',
      },
      approvalQueue: {
        empty: 'screens.approvalQueue.empty',
        loading: 'screens.approvalQueue.loading',
        error: 'screens.approvalQueue.error',
        retry: 'screens.approvalQueue.retry',
      },
      importWizard: {
        empty: 'screens.importWizard.empty',
        loading: 'screens.importWizard.loading',
        error: 'screens.importWizard.error',
        retry: 'screens.importWizard.retry',
      },
      staffSchedule: {
        empty: 'screens.staffSchedule.empty',
        loading: 'screens.staffSchedule.loading',
        error: 'screens.staffSchedule.error',
        retry: 'screens.staffSchedule.retry',
      },
      rdPortfolio: {
        empty: 'screens.rdPortfolio.empty',
        loading: 'screens.rdPortfolio.loading',
        error: 'screens.rdPortfolio.error',
        retry: 'screens.rdPortfolio.retry',
      },
      drillDown: {
        empty: 'screens.drillDown.empty',
        loading: 'screens.drillDown.loading',
        error: 'screens.drillDown.error',
        retry: 'screens.drillDown.retry',
      },
      historicDialog: {
        title: 'screens.historicDialog.title',
        body: 'screens.historicDialog.body',
        confirm: 'screens.historicDialog.confirm',
        cancel: 'screens.historicDialog.cancel',
      },
      changeLogFeed: {
        empty: 'screens.changeLogFeed.empty',
        loading: 'screens.changeLogFeed.loading',
        error: 'screens.changeLogFeed.error',
        retry: 'screens.changeLogFeed.retry',
      },
      adminRegisters: {
        empty: 'screens.adminRegisters.empty',
        loading: 'screens.adminRegisters.loading',
        error: 'screens.adminRegisters.error',
        retry: 'screens.adminRegisters.retry',
      },
    },
    errors: {
      HISTORIC_CONFIRM_REQUIRED: 'errors.HISTORIC_CONFIRM_REQUIRED',
      REASON_REQUIRED: 'errors.REASON_REQUIRED',
      BAD_HOURS: 'errors.BAD_HOURS',
      UNSUPPORTED_FORMAT: 'errors.UNSUPPORTED_FORMAT',
      INVALID_DATE: 'errors.INVALID_DATE',
      US_WEEK_DETECTED: 'errors.US_WEEK_DETECTED',
      HOURS_NEGATIVE: 'errors.HOURS_NEGATIVE',
      ALLOCATION_NOT_FOUND: 'errors.ALLOCATION_NOT_FOUND',
      PROPOSAL_NOT_FOUND: 'errors.PROPOSAL_NOT_FOUND',
      BATCH_NOT_FOUND: 'errors.BATCH_NOT_FOUND',
      SESSION_EXPIRED: 'errors.SESSION_EXPIRED',
      PROPOSAL_NOT_ACTIVE: 'errors.PROPOSAL_NOT_ACTIVE',
      BATCH_ALREADY_ROLLED_BACK: 'errors.BATCH_ALREADY_ROLLED_BACK',
      ROLLBACK_WINDOW_EXPIRED: 'errors.ROLLBACK_WINDOW_EXPIRED',
      SESSION_NOT_STAGED: 'errors.SESSION_NOT_STAGED',
      DUPLICATE_PROPOSAL: 'errors.DUPLICATE_PROPOSAL',
    },
    common: {
      toast: {
        retry: 'common.toast.retry',
        saved: 'common.toast.saved',
        failed: 'common.toast.failed',
      },
    },
  },
} as const;

export function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const next = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'object' && v !== null
      ? flattenKeys(v as Record<string, unknown>, next)
      : [next];
  });
}

/** Flat list of every dotted key under v5.*, prefixed with `v5.`. */
export const V5_KEYS: readonly string[] = flattenKeys(K.v5).map((k) => `v5.${k}`);
