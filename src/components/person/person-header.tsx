'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface PersonHeaderProps {
  personId: string;
  firstName: string;
  lastName: string;
  targetHours: number;
  discipline?: string;
  department?: string;
}

/**
 * Person name display with prev/next navigation arrows.
 * Fetches adjacent person IDs from /api/people/[id]/adjacent.
 */
export function PersonHeader({
  personId,
  firstName,
  lastName,
  targetHours,
  discipline,
  department,
}: PersonHeaderProps) {
  const router = useRouter();
  const [hasPrev, setHasPrev] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [navigating, setNavigating] = useState(false);

  // Check adjacency on mount / personId change
  useEffect(() => {
    let cancelled = false;

    async function checkAdjacent() {
      try {
        const [prevRes, nextRes] = await Promise.all([
          fetch(`/api/people/${personId}/adjacent?direction=prev`),
          fetch(`/api/people/${personId}/adjacent?direction=next`),
        ]);
        if (cancelled) return;

        const prevData = await prevRes.json();
        const nextData = await nextRes.json();
        if (cancelled) return;

        setHasPrev(!!prevData.person);
        setHasNext(!!nextData.person);
      } catch {
        // Silently fail -- buttons stay disabled
      }
    }

    checkAdjacent();
    return () => {
      cancelled = true;
    };
  }, [personId]);

  const navigate = useCallback(
    async (direction: 'prev' | 'next') => {
      setNavigating(true);
      try {
        const res = await fetch(`/api/people/${personId}/adjacent?direction=${direction}`);
        const data = await res.json();
        if (data.person?.id) {
          router.push(`/input/${data.person.id}`);
        }
      } catch {
        // Navigation failed -- ignore
      } finally {
        setNavigating(false);
      }
    },
    [personId, router],
  );

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        disabled={!hasPrev || navigating}
        onClick={() => navigate('prev')}
        className="hover:bg-surface-container-low text-outline flex h-8 w-8 items-center justify-center rounded-sm p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Previous person"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="flex min-w-0 flex-1 items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-headline text-on-surface text-2xl font-semibold tracking-tight">
              {firstName} {lastName}
            </h1>
            {discipline && (
              <span className="bg-secondary-container text-on-secondary-fixed rounded-full px-2.5 py-0.5 text-xs font-semibold">
                {discipline}
              </span>
            )}
            {department && (
              <span className="bg-secondary-container text-on-secondary-fixed rounded-full px-2.5 py-0.5 text-xs font-semibold">
                {department}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className="text-outline block text-[10px] font-semibold tracking-widest uppercase">
            Monthly Target
          </span>
          <span className="font-headline text-primary text-xl font-bold">
            {targetHours} h/month
          </span>
        </div>
      </div>

      <button
        type="button"
        disabled={!hasNext || navigating}
        onClick={() => navigate('next')}
        className="hover:bg-surface-container-low text-outline flex h-8 w-8 items-center justify-center rounded-sm p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Next person"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
