'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

import { usePeopleWithStatus } from '@/hooks/use-people';
import { getStatusColor } from '@/lib/capacity';
import type { PersonWithStatus } from '@/features/people/person.types';

interface PersonSidebarProps {
  activePersonId?: string;
}

/**
 * Sidebar listing all people grouped by department with colored status dots.
 * Follows creative-direction/08-person-input-sidebar.html design.
 */
export function PersonSidebar({ activePersonId }: PersonSidebarProps) {
  const { data: people, isLoading } = usePeopleWithStatus();
  const [search, setSearch] = useState('');

  // Filter by search term (client-side)
  const filtered = useMemo(() => {
    if (!people) return [];
    if (!search.trim()) return people;
    const term = search.toLowerCase();
    return people.filter(
      (p) =>
        p.firstName.toLowerCase().includes(term) ||
        p.lastName.toLowerCase().includes(term),
    );
  }, [people, search]);

  // Group by department name
  const grouped = useMemo(() => {
    const map = new Map<string, PersonWithStatus[]>();
    for (const person of filtered) {
      const dept = person.departmentName;
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept)!.push(person);
    }
    return map;
  }, [filtered]);

  return (
    <aside className="flex h-full w-72 flex-shrink-0 flex-col border-r border-outline-variant/15 bg-surface-container-low">
      <div className="flex-grow space-y-4 overflow-y-auto p-4">
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-outline"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            className="w-full rounded-sm border-none bg-surface-container-lowest py-2 pr-4 pl-9 text-xs shadow-sm focus:ring-1 focus:ring-primary"
            placeholder="Search people..."
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Loading state */}
        {isLoading && (
          <p className="px-2 text-xs text-on-surface-variant">Loading...</p>
        )}

        {/* People list grouped by department */}
        <nav className="space-y-6">
          {[...grouped.entries()].map(([department, members]) => (
            <div key={department}>
              <h3 className="font-headline mb-3 px-2 text-[10px] uppercase tracking-widest text-outline">
                {department}
              </h3>
              <div className="space-y-1">
                {members.map((person) => {
                  const isActive = person.id === activePersonId;
                  return (
                    <Link
                      key={person.id}
                      href={`/input/${person.id}`}
                      className={`group flex w-full items-center justify-between rounded-sm p-2 transition-all ${
                        isActive
                          ? 'bg-surface-variant font-semibold text-primary shadow-sm'
                          : 'hover:bg-surface-variant/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-2 w-2 rounded-full ${getStatusColor(person.status)}`}
                        />
                        <span className="font-body text-xs text-on-surface">
                          {person.firstName} {person.lastName}
                        </span>
                      </div>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          isActive
                            ? 'bg-primary text-on-primary'
                            : 'bg-secondary-container text-on-secondary-fixed'
                        }`}
                      >
                        {person.disciplineAbbreviation}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <p className="px-2 text-xs text-on-surface-variant">
            {search ? 'No people match your search.' : 'No people found.'}
          </p>
        )}
      </div>
    </aside>
  );
}
