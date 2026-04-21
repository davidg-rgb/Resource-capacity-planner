'use client';

/**
 * v5.0 — Phase 43 / Plan 43-02: generic side-drawer chrome.
 *
 * Minimal wrapper extracted from PlanVsActualDrawer so other surfaces
 * (admin registers, future forms) can reuse the backdrop + panel +
 * Esc-close behaviour without pulling in a new shadcn/radix Sheet dep.
 *
 * Usage:
 *   <Drawer open={open} onClose={close} title="Ny avdelning">
 *     <form>...</form>
 *   </Drawer>
 */

import { useEffect, type ReactNode } from 'react';
import { FocusTrap } from 'focus-trap-react';

import styles from './PlanVsActualDrawer.module.css';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel?: string;
  children: ReactNode;
  /** Optional aria-label override. Defaults to `title`. */
  ariaLabel?: string;
}

export function Drawer(props: DrawerProps) {
  const { open, onClose, title, closeLabel = 'Stäng', children, ariaLabel } = props;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // v6.0 — Phase 52 / Plan 52-05 (SHARED-01 / D-11 / Q5): wrap the panel in
  // <FocusTrap> so Tab cycling stays inside the drawer while it is open.
  // `focus-trap-react` auto-focuses the first tabbable on mount and restores
  // focus to the previously-focused element on unmount. `allowOutsideClick`
  // is true so the backdrop-click handler above still fires (the trap would
  // otherwise swallow the click → close would never run).
  return (
    <FocusTrap
      focusTrapOptions={{
        allowOutsideClick: true,
        clickOutsideDeactivates: false,
        fallbackFocus: '[data-testid="drawer-close"]',
      }}
    >
      <div
        className={styles.backdrop}
        data-testid="drawer-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <aside className={styles.panel} role="dialog" aria-label={ariaLabel ?? title}>
          <header className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            <button
              type="button"
              className={styles.closeBtn}
              data-testid="drawer-close"
              onClick={onClose}
              aria-label={closeLabel}
            >
              {closeLabel}
            </button>
          </header>
          {children}
        </aside>
      </div>
    </FocusTrap>
  );
}
