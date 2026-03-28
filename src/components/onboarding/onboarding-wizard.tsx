'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

import { StepDepartments } from './step-departments';
import { StepDisciplines } from './step-disciplines';
import { StepPeople } from './step-people';
import { StepComplete } from './step-complete';

import type { OnboardingStatus } from '@/features/onboarding/onboarding.types';

/* ---------- types ---------- */

export interface Department {
  id: string;
  name: string;
}

export interface Discipline {
  id: string;
  name: string;
  abbreviation: string;
}

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
}

const STEPS = [
  { label: 'Departments' },
  { label: 'Disciplines' },
  { label: 'People' },
  { label: 'Done' },
] as const;

/* ---------- component ---------- */

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);

  // Data loaded from existing state (idempotency)
  const [departments, setDepartments] = useState<Department[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);

  // Fetch existing data on mount for idempotency
  useEffect(() => {
    async function loadExisting() {
      try {
        const [statusRes, deptRes, discRes, peopleRes] = await Promise.all([
          fetch('/api/onboarding/status'),
          fetch('/api/departments'),
          fetch('/api/disciplines'),
          fetch('/api/people'),
        ]);

        if (statusRes.ok) {
          const data = await statusRes.json();
          setStatus(data);
        }
        if (deptRes.ok) {
          const data = await deptRes.json();
          setDepartments(data.departments ?? []);
        }
        if (discRes.ok) {
          const data = await discRes.json();
          setDisciplines(data.disciplines ?? []);
        }
        if (peopleRes.ok) {
          const data = await peopleRes.json();
          setPeople(data.people ?? []);
        }
      } catch {
        toast.error('Failed to load existing data');
      } finally {
        setLoading(false);
      }
    }
    loadExisting();
  }, []);

  const handleNext = useCallback(() => {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, []);

  const handleSkipAll = useCallback(async () => {
    try {
      await fetch('/api/onboarding/complete', { method: 'POST' });
      router.push('/input');
    } catch {
      toast.error('Failed to complete onboarding');
    }
  }, [router]);

  const addDepartment = useCallback((dept: Department) => {
    setDepartments((prev) => [...prev, dept]);
  }, []);

  const addDiscipline = useCallback((disc: Discipline) => {
    setDisciplines((prev) => [...prev, disc]);
  }, []);

  const addPerson = useCallback((person: Person) => {
    setPeople((prev) => [...prev, person]);
  }, []);

  if (loading) {
    return (
      <div className="bg-surface-container w-full max-w-2xl rounded-lg p-8 shadow">
        <div className="flex items-center justify-center py-12">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container w-full max-w-2xl rounded-lg p-6 shadow sm:p-8">
      <h1 className="text-on-surface mb-6 text-center text-2xl font-semibold">
        Set up your workspace
      </h1>

      {/* Step indicator */}
      <nav aria-label="Onboarding wizard steps" className="mb-8">
        <ol className="flex items-center justify-center">
          {STEPS.map((s, i) => {
            const isCompleted = i < step;
            const isCurrent = i === step;
            const isFuture = !isCompleted && !isCurrent;

            return (
              <li key={s.label} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                      isCompleted
                        ? 'bg-primary text-on-primary'
                        : isCurrent
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : <span>{i + 1}</span>}
                  </div>
                  <span
                    className={`mt-1.5 text-[10px] font-bold tracking-widest uppercase ${
                      isFuture ? 'text-on-surface-variant' : 'text-on-surface'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 w-12 sm:w-20 ${
                      isCompleted ? 'bg-primary' : 'bg-outline-variant'
                    }`}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step content */}
      {step === 0 && (
        <StepDepartments
          existingDepartments={departments}
          onAdd={addDepartment}
          onNext={handleNext}
          onSkipAll={handleSkipAll}
        />
      )}
      {step === 1 && (
        <StepDisciplines
          existingDisciplines={disciplines}
          onAdd={addDiscipline}
          onNext={handleNext}
          onSkipAll={handleSkipAll}
        />
      )}
      {step === 2 && (
        <StepPeople
          existingPeople={people}
          departments={departments}
          disciplines={disciplines}
          onAdd={addPerson}
          onNext={handleNext}
          onSkipAll={handleSkipAll}
        />
      )}
      {step === 3 && (
        <StepComplete
          departmentCount={departments.length}
          disciplineCount={disciplines.length}
          personCount={people.length}
        />
      )}
    </div>
  );
}
