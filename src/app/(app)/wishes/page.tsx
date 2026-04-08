'use client';

// v5.0 — Phase 39 / Plan 39-08 (PROP-06): PM "My Wishes" route.
// Scopes MyWishesPanel to the current Clerk userId (proposerId).

import { useAuth } from '@clerk/nextjs';

import { MyWishesPanel } from '@/features/proposals/ui/my-wishes-panel';

export default function WishesPage() {
  const { userId, isLoaded } = useAuth();

  if (!isLoaded) {
    return <div className="text-muted-foreground p-4 text-sm">Loading…</div>;
  }
  if (!userId) {
    return <div className="p-4 text-sm">Not authenticated</div>;
  }

  return (
    <div className="p-4">
      <h1 className="mb-3 text-xl font-semibold">My wishes</h1>
      <p className="text-muted-foreground mb-4 text-sm">
        Proposals you have submitted. Switch tabs to review state, and resubmit rejected wishes with
        updated hours or notes.
      </p>
      <MyWishesPanel proposerId={userId} />
    </div>
  );
}
