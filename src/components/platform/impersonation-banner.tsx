'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth, useOrganization, useUser } from '@clerk/nextjs';

const IMPERSONATION_SESSION_KEY = 'impersonation_session_id';
const IMPERSONATION_EXPIRES_KEY = 'impersonation_expires_at';

/**
 * Store impersonation metadata in localStorage when a session begins.
 * Call this from the page/component that initiates impersonation.
 */
export function storeImpersonationSession(sessionId: string, expiresAt: string) {
  localStorage.setItem(IMPERSONATION_SESSION_KEY, sessionId);
  localStorage.setItem(IMPERSONATION_EXPIRES_KEY, expiresAt);
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function ImpersonationBanner() {
  const { actor, signOut } = useAuth();
  const { user } = useUser();
  const { organization } = useOrganization();
  const router = useRouter();
  const [ending, setEnding] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const expiresAtRef = useRef<number | null>(null);

  // Read expiry and start countdown
  useEffect(() => {
    if (!actor) return;
    const stored = localStorage.getItem(IMPERSONATION_EXPIRES_KEY);
    if (!stored) return;
    expiresAtRef.current = new Date(stored).getTime();

    const tick = () => {
      const remaining = Math.max(0, (expiresAtRef.current ?? 0) - Date.now());
      setTimeRemaining(remaining);
      if (remaining <= 0) clearInterval(interval);
    };

    tick(); // initial read
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [actor]);

  const isExpired = timeRemaining !== null && timeRemaining <= 0;

  // Auto-redirect on expiry
  useEffect(() => {
    if (!isExpired) return;
    const timeout = setTimeout(async () => {
      localStorage.removeItem(IMPERSONATION_SESSION_KEY);
      localStorage.removeItem(IMPERSONATION_EXPIRES_KEY);
      await signOut();
      router.push('/platform');
    }, 3000);
    return () => clearTimeout(timeout);
  }, [isExpired, signOut, router]);

  const handleEndSession = useCallback(async () => {
    setEnding(true);
    try {
      const sessionId = localStorage.getItem(IMPERSONATION_SESSION_KEY);
      if (sessionId) {
        await fetch(`/api/platform/impersonation/${sessionId}/end`, {
          method: 'POST',
        });
      }
      localStorage.removeItem(IMPERSONATION_SESSION_KEY);
      localStorage.removeItem(IMPERSONATION_EXPIRES_KEY);
      await signOut();
      router.push('/platform');
    } catch {
      // Still sign out even if API call fails
      localStorage.removeItem(IMPERSONATION_SESSION_KEY);
      localStorage.removeItem(IMPERSONATION_EXPIRES_KEY);
      await signOut();
      router.push('/platform');
    }
  }, [signOut, router]);

  if (!actor) return null;

  const userName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.primaryEmailAddress?.emailAddress || 'Unknown user'
    : 'Loading...';
  const orgName = organization?.name ?? '';

  if (isExpired) {
    return (
      <div className="fixed top-0 right-0 left-0 z-50 bg-red-600 px-4 py-2 text-center text-sm font-semibold text-white">
        Session expired &mdash; redirecting to platform admin...
      </div>
    );
  }

  return (
    <div className="fixed top-0 right-0 left-0 z-50 bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-black">
      <span>
        Impersonating {userName}
        {orgName ? ` (${orgName})` : ''}
        {' '}&mdash; Actions are being logged
        {timeRemaining !== null && (
          <span className="ml-2">({formatTimeRemaining(timeRemaining)} remaining)</span>
        )}
      </span>
      <button
        onClick={handleEndSession}
        disabled={ending}
        className="ml-4 font-bold underline hover:text-amber-900 disabled:opacity-50"
      >
        {ending ? 'Ending...' : 'End Session'}
      </button>
    </div>
  );
}
