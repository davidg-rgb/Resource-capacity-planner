'use client';

import Link from 'next/link';

import { usePeople } from '@/hooks/use-people';

export default function InputPage() {
  const { data: people, isLoading } = usePeople();

  if (isLoading) {
    return <div className="p-6 text-on-surface-variant">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="font-headline text-2xl font-semibold tracking-tight text-on-surface">
        Person Input
      </h1>
      <p className="text-sm text-on-surface-variant">
        Select a person to view and edit their allocation grid.
      </p>
      <ul className="space-y-1">
        {people?.map((p) => (
          <li key={p.id}>
            <Link
              href={`/input/${p.id}`}
              className="block rounded-md px-3 py-2 text-sm text-on-surface hover:bg-surface-container"
            >
              {p.firstName} {p.lastName}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
