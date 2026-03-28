'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface StepCompleteProps {
  departmentCount: number;
  disciplineCount: number;
  personCount: number;
}

export function StepComplete({ departmentCount, disciplineCount, personCount }: StepCompleteProps) {
  const calledRef = useRef(false);
  const [completed, setCompleted] = useState(false);
  const [failed, setFailed] = useState(false);

  async function markComplete() {
    try {
      setFailed(false);
      const res = await fetch('/api/onboarding/complete', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCompleted(true);
    } catch {
      setFailed(true);
      toast.error('Failed to mark onboarding as complete');
    }
  }

  // Mark onboarding complete on mount
  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    markComplete();
  }, []);

  const parts: string[] = [];
  if (departmentCount > 0)
    parts.push(`${departmentCount} department${departmentCount !== 1 ? 's' : ''}`);
  if (disciplineCount > 0)
    parts.push(`${disciplineCount} discipline${disciplineCount !== 1 ? 's' : ''}`);
  if (personCount > 0) parts.push(`${personCount} ${personCount !== 1 ? 'people' : 'person'}`);

  if (failed) {
    return (
      <div className="flex flex-col items-center space-y-4 py-4">
        <p className="text-on-surface-variant text-sm">
          Failed to finalize onboarding. Please retry.
        </p>
        <button
          onClick={markComplete}
          className="bg-primary text-on-primary hover:bg-primary/90 flex items-center gap-2 rounded px-6 py-2.5 text-sm font-medium transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  if (!completed) {
    return (
      <div className="flex flex-col items-center py-8">
        <div className="bg-surface-container h-8 w-8 animate-pulse rounded-full" />
        <p className="text-on-surface-variant mt-3 text-sm">Finalizing setup...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-6 py-4">
      <CheckCircle className="text-primary h-16 w-16" />

      <div className="text-center">
        <h2 className="text-on-surface mb-2 text-xl font-semibold">You&apos;re all set!</h2>
        {parts.length > 0 ? (
          <p className="text-on-surface-variant text-sm">{parts.join(', ')} created</p>
        ) : (
          <p className="text-on-surface-variant text-sm">
            Your workspace is ready. You can add data anytime.
          </p>
        )}
      </div>

      <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/input"
          className="bg-primary text-on-primary hover:bg-primary/90 flex items-center justify-center gap-2 rounded px-6 py-2.5 text-sm font-medium transition-colors"
        >
          Go to Resource Planning
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/dashboard/team"
          className="border-outline-variant text-on-surface hover:bg-surface-container flex items-center justify-center gap-2 rounded border px-6 py-2.5 text-sm font-medium transition-colors"
        >
          View Team Overview
        </Link>
      </div>
    </div>
  );
}
