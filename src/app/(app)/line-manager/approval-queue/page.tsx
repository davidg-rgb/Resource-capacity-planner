'use client';

// v5.0 — Phase 39 / Plan 39-07 (PROP-04): Line Manager approval queue route.
// Gated by <PersonaGate allowed={['line-manager', 'admin']}> (LM-GATE-003).
// i18n via useTranslations('v5.proposals') (Plan 39-09 sweep).

import { useTranslations } from 'next-intl';

import { ApprovalQueue } from '@/features/proposals/ui/approval-queue';
import { usePersona } from '@/features/personas/persona.context';
import { PersonaGate } from '@/features/personas/persona-route-guard';

export default function ApprovalQueuePage() {
  return (
    <PersonaGate allowed={['line-manager', 'admin']}>
      <ApprovalQueueInner />
    </PersonaGate>
  );
}

function ApprovalQueueInner() {
  const { persona } = usePersona();
  const t = useTranslations('v5.proposals');

  const departmentId = persona.kind === 'line-manager' ? persona.departmentId : '';

  return (
    <div className="p-4">
      <h1 className="mb-3 text-xl font-semibold">{t('page.approvalQueue')}</h1>
      <ApprovalQueue departmentId={departmentId} />
    </div>
  );
}
