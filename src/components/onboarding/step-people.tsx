'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import type { Department, Discipline, Person } from './onboarding-wizard';

interface StepPeopleProps {
  existingPeople: Person[];
  departments: Department[];
  disciplines: Discipline[];
  onAdd: (person: Person) => void;
  onNext: () => void;
  onSkipAll: () => void;
}

export function StepPeople({
  existingPeople,
  departments,
  disciplines,
  onAdd,
  onNext,
  onSkipAll,
}: StepPeopleProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? '');
  const [disciplineId, setDisciplineId] = useState(disciplines[0]?.id ?? '');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    if (!departmentId || !disciplineId) {
      toast.error('Please select a department and discipline');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          departmentId,
          disciplineId,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      onAdd(data.person);
      setFirstName('');
      setLastName('');
      toast.success('Person added');
    } catch {
      toast.error('Failed to create person');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleImportRedirect() {
    try {
      await fetch('/api/onboarding/complete', { method: 'POST' });
      window.location.href = '/import';
    } catch {
      toast.error('Failed to complete onboarding');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-on-surface mb-1 text-lg font-medium">Add your first team member</h2>
        <p className="text-on-surface-variant text-sm">
          Add people to start planning their capacity, or import from a spreadsheet.
        </p>
      </div>

      {existingPeople.length > 0 && (
        <p className="text-on-surface-variant text-sm">
          You already have {existingPeople.length} {existingPeople.length === 1 ? 'person' : 'people'}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="onb-first-name" className="text-on-surface mb-1 block text-xs font-medium">
              First name
            </label>
            <input
              id="onb-first-name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="bg-surface text-on-surface placeholder:text-on-surface-variant border-outline-variant focus:border-primary w-full rounded border px-3 py-2 text-sm outline-none"
              placeholder="Jane"
            />
          </div>
          <div>
            <label htmlFor="onb-last-name" className="text-on-surface mb-1 block text-xs font-medium">
              Last name
            </label>
            <input
              id="onb-last-name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="bg-surface text-on-surface placeholder:text-on-surface-variant border-outline-variant focus:border-primary w-full rounded border px-3 py-2 text-sm outline-none"
              placeholder="Smith"
            />
          </div>
        </div>

        {departments.length > 0 && (
          <div>
            <label htmlFor="onb-dept" className="text-on-surface mb-1 block text-xs font-medium">
              Department
            </label>
            <select
              id="onb-dept"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="bg-surface text-on-surface border-outline-variant focus:border-primary w-full rounded border px-3 py-2 text-sm outline-none"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {disciplines.length > 0 && (
          <div>
            <label htmlFor="onb-disc" className="text-on-surface mb-1 block text-xs font-medium">
              Discipline
            </label>
            <select
              id="onb-disc"
              value={disciplineId}
              onChange={(e) => setDisciplineId(e.target.value)}
              className="bg-surface text-on-surface border-outline-variant focus:border-primary w-full rounded border px-3 py-2 text-sm outline-none"
            >
              {disciplines.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.abbreviation})
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !firstName.trim() || !lastName.trim()}
          className="bg-primary text-on-primary hover:bg-primary/90 disabled:bg-surface-container disabled:text-on-surface-variant flex w-full items-center justify-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          {submitting ? 'Adding...' : 'Add person'}
        </button>
      </form>

      <div className="border-outline-variant flex items-center gap-3 border-t pt-4">
        <span className="text-on-surface-variant text-sm">Or</span>
        <button
          type="button"
          onClick={handleImportRedirect}
          className="text-primary hover:text-primary/80 text-sm font-medium underline"
        >
          Import from spreadsheet
        </button>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onSkipAll}
          className="text-on-surface-variant hover:text-on-surface text-sm underline"
        >
          Skip setup
        </button>
        <button
          type="button"
          onClick={onNext}
          className="bg-primary text-on-primary hover:bg-primary/90 rounded px-6 py-2 text-sm font-medium transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
