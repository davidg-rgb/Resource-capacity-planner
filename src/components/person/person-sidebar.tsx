'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Users, X } from 'lucide-react';

import { usePeopleWithStatus } from '@/hooks/use-people';
import { getStatusColor } from '@/lib/capacity';
import type { PersonWithStatus } from '@/features/people/person.types';

interface PersonSidebarProps {
  activePersonId?: string;
}

/**
 * Sidebar listing all people grouped by department with colored status dots.
 * Follows creative-direction/08-person-input-sidebar.html design.
 * Responsive: hidden on small screens with a toggle button to show as overlay.
 */
export function PersonSidebar({ activePersonId }: PersonSidebarProps) {
  const { data: people, isLoading } = usePeopleWithStatus();
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Filter by search term (client-side)
  const filtered = useMemo(() => {
    if (!people) return [];
    if (!search.trim()) return people;
    const term = search.toLowerCase();
    return people.filter(
      (p) => p.firstName.toLowerCase().includes(term) || p.lastName.toLowerCase().includes(term),
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

  const sidebarContent = (
    <div className="flex-grow space-y-4 overflow-y-auto p-4">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="text-outline absolute top-1/2 left-3 -translate-y-1/2" />
        <input
          className="bg-surface-container-lowest focus:ring-primary w-full rounded-sm border-none py-2 pr-4 pl-9 text-xs shadow-sm focus:ring-1"
          placeholder="Search people..."
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Loading state */}
      {isLoading && <p className="text-on-surface-variant px-2 text-xs">Loading...</p>}

      {/* People list grouped by department */}
      <nav className="space-y-6">
        {[...grouped.entries()].map(([department, members]) => (
          <div key={department}>
            <h3 className="font-headline text-outline mb-3 px-2 text-[10px] tracking-widest uppercase">
              {department}
            </h3>
            <div className="space-y-1">
              {members.map((person) => {
                const isActive = person.id === activePersonId;
                return (
                  <Link
                    key={person.id}
                    href={`/input/${person.id}`}
                    onClick={() => setMobileOpen(false)}
                    className={`group flex w-full items-center justify-between rounded-sm p-2 transition-all ${
                      isActive
                        ? 'bg-surface-variant text-primary font-semibold shadow-sm'
                        : 'hover:bg-surface-variant/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full ${getStatusColor(person.status).dot}`}
                      />
                      <span className="font-body text-on-surface text-xs">
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
        <p className="text-on-surface-variant px-2 text-xs">
          {search ? 'No people match your search.' : 'No people found.'}
        </p>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile toggle button — visible below lg */}
      <button
        type="button"
        aria-label="Show people sidebar"
        className="bg-primary text-on-primary fixed bottom-4 left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg lg:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Users size={20} />
      </button>

      {/* Mobile overlay — visible below lg when open */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="bg-surface-container-low relative z-10 flex h-full w-72 flex-col shadow-lg">
            <div className="border-outline-variant/15 flex items-center justify-between border-b px-4 py-3">
              <span className="font-headline text-on-surface text-sm font-semibold">People</span>
              <button
                type="button"
                aria-label="Close sidebar"
                className="text-on-surface-variant hover:bg-surface-container-high rounded-sm p-1"
                onClick={() => setMobileOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar — visible at lg and above */}
      <aside className="border-outline-variant/15 bg-surface-container-low hidden h-full w-72 flex-shrink-0 flex-col border-r lg:flex">
        {sidebarContent}
      </aside>
    </>
  );
}
