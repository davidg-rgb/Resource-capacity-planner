'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { ScenarioBanner } from '@/components/scenarios/scenario-banner';
import { ComparisonView } from '@/components/scenarios/comparison-view';
import { useScenario } from '@/hooks/use-scenarios';
import { useScenarioComparison } from '@/hooks/use-scenario-analytics';

function getDefaultRange() {
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const toDate = new Date(now.getFullYear(), now.getMonth() + 5, 1);
  const to = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, '0')}`;
  return { from, to };
}

export default function ScenarioComparePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: scenarioId } = use(params);
  const { from, to } = getDefaultRange();

  const { data: scenario, isLoading: scenarioLoading } = useScenario(scenarioId);
  const { data: comparison, isLoading: comparisonLoading } = useScenarioComparison(
    scenarioId,
    from,
    to,
  );

  if (scenarioLoading || !scenario) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-12 animate-pulse rounded-md bg-amber-100" />
        <div className="h-64 animate-pulse rounded-md bg-slate-50" />
      </div>
    );
  }

  return (
    <>
      {/* Non-dismissible banner */}
      <ScenarioBanner scenario={scenario} />

      <div
        className="min-h-[calc(100vh-8rem)] p-6"
        style={{ backgroundColor: 'rgba(245, 158, 11, 0.02)' }}
      >
        {/* Back link */}
        <Link
          href={`/scenarios/${scenarioId}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-amber-700 hover:text-amber-800 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Tillbaka till scenario
        </Link>

        <h1 className="font-headline text-on-surface mb-1 text-xl font-semibold">
          Jämför: &ldquo;{scenario.name}&rdquo; vs verklighet
        </h1>
        <p className="text-on-surface-variant mb-6 text-sm">
          {from} till {to} — Verklig data är skrivskyddad (vänster), scenario är redigerbart
          (höger).
        </p>

        <ComparisonView comparison={comparison} isLoading={comparisonLoading} />
      </div>
    </>
  );
}
