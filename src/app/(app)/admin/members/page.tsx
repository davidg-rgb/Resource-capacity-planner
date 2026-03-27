'use client';

import { OrganizationProfile } from '@clerk/nextjs';

export default function MembersPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-headline text-2xl font-bold mb-6">Team Members</h1>
      <OrganizationProfile
        appearance={{ elements: { rootBox: 'w-full', card: 'shadow-none' } }}
      />
    </div>
  );
}
