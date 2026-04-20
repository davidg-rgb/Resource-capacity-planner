'use client';

import Link from 'next/link';

import { usePeople } from '@/hooks/use-people';

export default function InputPage() {
  const { data: people, isLoading } = usePeople();

  if (isLoading) {
    return <div className="text-on-surface-variant p-6">Laddar...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="font-headline text-on-surface text-2xl font-semibold tracking-tight">
        Personplanering
      </h1>
      <p className="text-on-surface-variant text-sm">
        Välj en person för att visa och redigera allokeringen.
      </p>
      <ul className="space-y-1">
        {people?.map((p) => (
          <li key={p.id}>
            <Link
              href={`/input/${p.id}`}
              className="text-on-surface hover:bg-surface-container block rounded-md px-3 py-2 text-sm"
            >
              {p.firstName} {p.lastName}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
