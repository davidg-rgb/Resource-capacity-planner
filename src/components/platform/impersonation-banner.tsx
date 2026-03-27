'use client';

import { useAuth } from '@clerk/nextjs';

export function ImpersonationBanner() {
  const { actor, signOut } = useAuth();

  if (!actor) return null;

  return (
    <div className="fixed top-0 right-0 left-0 z-50 bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-black">
      <span>Impersonating user &mdash; Actions are being logged</span>
      <button onClick={() => signOut()} className="ml-4 font-bold underline hover:text-amber-900">
        End Session
      </button>
    </div>
  );
}
