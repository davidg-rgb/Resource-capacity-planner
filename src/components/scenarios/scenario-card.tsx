'use client';

import Link from 'next/link';
import { FlaskConical, Clock, FileEdit, Trash2, MoreVertical } from 'lucide-react';
import { useState } from 'react';

import type { ScenarioListItem } from '@/features/scenarios/scenario.types';

interface ScenarioCardProps {
  scenario: ScenarioListItem;
  onDelete: (id: string) => void;
}

export function ScenarioCard({ scenario, onDelete }: ScenarioCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const statusColors = {
    draft: 'bg-slate-100 text-slate-700',
    active: 'bg-amber-100 text-amber-800',
    archived: 'bg-gray-100 text-gray-500',
  };

  const visibilityLabels = {
    private: 'Privat',
    shared_readonly: 'Delad (skrivskyddad)',
    shared_collaborative: 'Delad (samarbete)',
    published: 'Publicerad',
  };

  const updatedDate = new Date(scenario.updatedAt).toLocaleDateString('sv-SE');

  return (
    <div className="border-outline-variant/30 bg-surface-container-low group relative rounded-lg border p-4 transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <Link
          href={`/scenarios/${scenario.id}`}
          className="flex items-center gap-2 hover:underline"
        >
          <FlaskConical className="h-4 w-4 text-amber-500" />
          <h3 className="text-on-surface font-headline text-sm font-semibold">{scenario.name}</h3>
        </Link>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-on-surface-variant rounded-full p-1 hover:bg-slate-100"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="bg-surface-container-lowest absolute right-0 z-20 mt-1 w-36 rounded-md border py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(scenario.id);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Ta bort
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      {scenario.description && (
        <p className="text-on-surface-variant mb-3 line-clamp-2 text-xs">{scenario.description}</p>
      )}

      {/* Tags */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[scenario.status]}`}
        >
          {scenario.status === 'draft'
            ? 'Utkast'
            : scenario.status === 'active'
              ? 'Aktiv'
              : 'Arkiverad'}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
          {visibilityLabels[scenario.visibility]}
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <FileEdit className="h-3 w-3" />
          {scenario.modifiedCount} ändringar
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {updatedDate}
        </span>
      </div>
    </div>
  );
}
