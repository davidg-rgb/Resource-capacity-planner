'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Shield } from 'lucide-react';

import { ScenarioBanner } from '@/components/scenarios/scenario-banner';
import { ImpactBar } from '@/components/scenarios/impact-bar';
import { PromoteModal } from '@/components/scenarios/promote-modal';
import { ExitScenarioDialog } from '@/components/scenarios/exit-scenario-dialog';
import { useScenario } from '@/hooks/use-scenarios';
import { useScenarioAllocations } from '@/hooks/use-scenario-allocations';
import { useScenarioImpact } from '@/hooks/use-scenario-analytics';
import { usePromoteAllocations } from '@/hooks/use-scenario-promote';
import { useScenarioGridAutosave } from '@/hooks/use-scenario-grid-autosave';

// Default date range: current month + 5 months ahead
function getDefaultRange() {
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const toDate = new Date(now.getFullYear(), now.getMonth() + 5, 1);
  const to = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, '0')}`;
  return { from, to };
}

export default function ScenarioEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: scenarioId } = use(params);
  const router = useRouter();
  const { from, to } = getDefaultRange();

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);

  const { data: scenario, isLoading: scenarioLoading } = useScenario(scenarioId);
  const { data: allocations, isLoading: allocationsLoading } = useScenarioAllocations(scenarioId);
  const { data: impact, isLoading: impactLoading } = useScenarioImpact(scenarioId, from, to);
  const promoteMutation = usePromoteAllocations(scenarioId);
  const { flush } = useScenarioGridAutosave(scenarioId);

  const handleSave = async () => {
    await flush();
    setHasUnsavedChanges(false);
    toast.success('Scenario sparat');
  };

  const handleSaveAndExit = async () => {
    await flush();
    router.push('/scenarios');
  };

  const handleDiscardAndExit = () => {
    router.push('/scenarios');
  };

  const handlePromote = async (allocationIds: string[]) => {
    try {
      const result = await promoteMutation.mutateAsync({
        allocationIds,
        confirmation: true,
      });
      setShowPromoteModal(false);
      toast.success(`${result.promoted} andringar tillampade pa verklig planering.`, {
        action: {
          label: 'Angra',
          onClick: () => {
            // Undo would require a separate endpoint — for now just notify
            toast.info('Angra-funktionen ar inte tillganglig annu.');
          },
        },
        duration: 30_000,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Promotion misslyckades');
    }
  };

  if (scenarioLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-12 animate-pulse rounded-md bg-amber-100" />
        <div className="h-8 animate-pulse rounded-md bg-amber-50" />
        <div className="h-64 animate-pulse rounded-md bg-slate-50" />
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-slate-500">Scenariot hittades inte.</p>
      </div>
    );
  }

  // Build promotable allocations for the modal
  const promotableAllocations = (allocations ?? [])
    .filter((a) => a.isModified || a.isNew || a.isRemoved)
    .map((a) => ({
      id: a.id,
      personName: a.personFirstName
        ? `${a.personFirstName} ${a.personLastName}`
        : (a.tempEntityId ?? 'Okand'),
      projectName: a.projectName ?? a.tempProjectName ?? 'Okant projekt',
      month: a.month,
      hours: a.hours,
      isNew: a.isNew,
      isRemoved: a.isRemoved,
      isArchived: !!a.archivedAt,
      isPromoted: !!a.promotedAt,
    }));

  return (
    <>
      {/* Non-dismissible amber banner — ALWAYS visible on scenario pages */}
      <ScenarioBanner
        scenario={scenario}
        hasUnsavedChanges={hasUnsavedChanges}
        onSave={handleSave}
        onShowExitDialog={() => setShowExitDialog(true)}
      />

      {/* Ambient amber tint on content area */}
      <div
        className="min-h-[calc(100vh-8rem)] p-6"
        style={{ backgroundColor: 'rgba(245, 158, 11, 0.02)' }}
      >
        {/* Impact preview bar */}
        <div className="mb-6">
          <ImpactBar impact={impact} isLoading={impactLoading} />
        </div>

        {/* Promote button (admin only — gating done server-side) */}
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowPromoteModal(true)}
            disabled={promotableAllocations.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Shield className="h-4 w-4" />
            Tillampa pa verklig planering
          </button>
          <span className="text-xs text-slate-500">
            {promotableAllocations.filter((a) => !a.isPromoted).length} andringar att tillampa
          </span>
        </div>

        {/* Allocations list */}
        {allocationsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-amber-50/50" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Person</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">
                    Projekt
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Manad</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">
                    Timmar
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(allocations ?? []).map((alloc, idx) => {
                  const isModified = alloc.isModified || alloc.isNew || alloc.isRemoved;
                  const isPromoted = !!alloc.promotedAt;
                  const isArchived = !!alloc.archivedAt;

                  return (
                    <tr
                      key={`${alloc.id}-${idx}`}
                      className={
                        isPromoted ? 'bg-emerald-50/30' : isModified ? 'bg-amber-50/30' : ''
                      }
                      style={
                        isModified && !isPromoted
                          ? {
                              backgroundImage:
                                'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(245,158,11,0.08) 10px, rgba(245,158,11,0.08) 20px)',
                            }
                          : undefined
                      }
                    >
                      <td
                        className={`px-3 py-2 text-sm ${isArchived ? 'text-slate-400' : 'text-slate-700'}`}
                      >
                        {alloc.personFirstName
                          ? `${alloc.personFirstName} ${alloc.personLastName}`
                          : 'Hypotetisk resurs'}
                        {isArchived && (
                          <span className="ml-1.5 text-[10px] text-amber-600" title="Arkiverad">
                            (arkiverad)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-600">
                        {alloc.projectName ?? alloc.tempProjectName ?? '-'}
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-500">{alloc.month}</td>
                      <td
                        className={`px-3 py-2 text-right text-sm font-medium ${
                          alloc.isRemoved ? 'text-slate-400 line-through' : 'text-slate-700'
                        }`}
                      >
                        {alloc.hours}h
                      </td>
                      <td className="px-3 py-2 text-center">
                        {isPromoted ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                            Tillampad
                          </span>
                        ) : alloc.isNew ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                            Ny
                          </span>
                        ) : alloc.isModified ? (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                            Andrad
                          </span>
                        ) : alloc.isRemoved ? (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                            Borttagen
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Bas</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <ExitScenarioDialog
        open={showExitDialog}
        onClose={() => setShowExitDialog(false)}
        onSaveAndExit={handleSaveAndExit}
        onDiscardAndExit={handleDiscardAndExit}
      />

      <PromoteModal
        open={showPromoteModal}
        onClose={() => setShowPromoteModal(false)}
        allocations={promotableAllocations}
        onPromote={handlePromote}
        isPromoting={promoteMutation.isPending}
      />
    </>
  );
}
