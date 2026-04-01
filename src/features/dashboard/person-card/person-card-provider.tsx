'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { PersonCardOverlay } from './person-card-overlay';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface PersonCardContextValue {
  personId: string | null;
  isOpen: boolean;
  openPersonCard: (personId: string) => void;
  closePersonCard: () => void;
}

const PersonCardContext = createContext<PersonCardContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface PersonCardProviderProps {
  children: ReactNode;
}

export function PersonCardProvider({ children }: PersonCardProviderProps) {
  const [personId, setPersonId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openPersonCard = useCallback((id: string) => {
    setPersonId(id);
    setIsOpen(true);
  }, []);

  const closePersonCard = useCallback(() => {
    setIsOpen(false);
    // Delay clearing personId to allow exit animation
    setTimeout(() => setPersonId(null), 300);
  }, []);

  const value = useMemo(
    () => ({ personId, isOpen, openPersonCard, closePersonCard }),
    [personId, isOpen, openPersonCard, closePersonCard],
  );

  return (
    <PersonCardContext.Provider value={value}>
      {children}
      {personId && typeof document !== 'undefined'
        ? createPortal(
            <PersonCardOverlay personId={personId} isOpen={isOpen} onClose={closePersonCard} />,
            document.body,
          )
        : null}
    </PersonCardContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access the Person 360 Card context.
 * Must be used within a PersonCardProvider (app layout wraps the entire app).
 */
export function usePersonCard(): PersonCardContextValue {
  const context = useContext(PersonCardContext);
  if (!context) {
    throw new Error('usePersonCard must be used within a PersonCardProvider');
  }
  return context;
}
