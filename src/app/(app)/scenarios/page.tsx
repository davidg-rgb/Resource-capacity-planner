'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FlaskConical, Plus } from 'lucide-react';

import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { ScenarioCard } from '@/components/scenarios/scenario-card';
import { CreateScenarioModal } from '@/components/scenarios/create-scenario-modal';
import { useScenarios, useCreateScenario, useDeleteScenario } from '@/hooks/use-scenarios';

export default function ScenariosListPage() {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const { data: scenarios, isLoading } = useScenarios();
  const createMutation = useCreateScenario();
  const deleteMutation = useDeleteScenario();

  const handleCreate = async (data: {
    name: string;
    description?: string;
    baseScenarioId?: string;
  }) => {
    const scenario = await createMutation.mutateAsync(data);
    setShowCreate(false);
    router.push(`/scenarios/${scenario.id}`);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Ar du saker pa att du vill ta bort detta scenario?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <>
      <Breadcrumbs />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-headline text-on-surface flex items-center gap-2 text-2xl font-semibold">
            <FlaskConical className="h-6 w-6 text-amber-500" />
            Scenarier
          </h1>
          <p className="text-on-surface-variant font-body mt-1 text-sm">
            Skapa och utforska hypotetiska personalplaneringar utan att paverka verklig data.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-600"
        >
          <Plus className="h-4 w-4" />
          Skapa nytt scenario
        </button>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="border-outline-variant/30 h-36 animate-pulse rounded-lg border bg-slate-50"
            />
          ))}
        </div>
      )}

      {!isLoading && scenarios && scenarios.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 py-16">
          <FlaskConical className="mb-3 h-12 w-12 text-slate-300" />
          <p className="mb-1 text-sm font-medium text-slate-600">Inga scenarier annu</p>
          <p className="mb-4 text-xs text-slate-400">
            Skapa ditt forsta scenario for att utforska alternativa planeringar.
          </p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
          >
            <Plus className="h-3.5 w-3.5" />
            Skapa nytt scenario
          </button>
        </div>
      )}

      {!isLoading && scenarios && scenarios.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((scenario) => (
            <ScenarioCard key={scenario.id} scenario={scenario} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <CreateScenarioModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
        isCreating={createMutation.isPending}
        existingScenarios={scenarios ?? []}
      />
    </>
  );
}
