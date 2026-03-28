'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface StepCompleteProps {
  departmentCount: number;
  disciplineCount: number;
  personCount: number;
}

export function StepComplete({ departmentCount, disciplineCount, personCount }: StepCompleteProps) {
  const calledRef = useRef(false);

  // Mark onboarding complete on mount
  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    fetch('/api/onboarding/complete', { method: 'POST' }).catch(() => {
      toast.error('Failed to mark onboarding as complete');
    });
  }, []);

  const parts: string[] = [];
  if (departmentCount > 0)
    parts.push(`${departmentCount} department${departmentCount !== 1 ? 's' : ''}`);
  if (disciplineCount > 0)
    parts.push(`${disciplineCount} discipline${disciplineCount !== 1 ? 's' : ''}`);
  if (personCount > 0) parts.push(`${personCount} ${personCount !== 1 ? 'people' : 'person'}`);

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
          href="/team"
          className="border-outline-variant text-on-surface hover:bg-surface-container flex items-center justify-center gap-2 rounded border px-6 py-2.5 text-sm font-medium transition-colors"
        >
          View Team Overview
        </Link>
      </div>
    </div>
  );
}
