'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';

// ---------------------------------------------------------------------------
// Cross-Linking Event Types
// ---------------------------------------------------------------------------

export type CrossLinkAction = 'open-finder' | 'open-person-card' | 'scroll-to-widget';

export interface CrossLinkEvent {
  /** Source widget that triggered the action */
  source: string;
  /** Target action type */
  action: CrossLinkAction;
  /** Payload depends on action type */
  payload: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Subscriber type
// ---------------------------------------------------------------------------

type CrossLinkHandler = (payload: Record<string, unknown>) => void;

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface CrossLinkContextValue {
  /** Emit a cross-link event from a widget */
  emit: (event: CrossLinkEvent) => void;
  /** Subscribe to a specific action type. Returns unsubscribe fn. */
  subscribe: (action: CrossLinkAction, handler: CrossLinkHandler) => () => void;
  /** Register a ref for a widget element (for scroll-to) */
  registerWidgetRef: (widgetId: string, el: HTMLElement | null) => void;
}

const CrossLinkContext = createContext<CrossLinkContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function CrossLinkProvider({ children }: { children: ReactNode }) {
  const widgetRefs = useRef<Map<string, HTMLElement>>(new Map());
  const subscribers = useRef<Map<CrossLinkAction, Set<CrossLinkHandler>>>(new Map());

  const registerWidgetRef = useCallback((widgetId: string, el: HTMLElement | null) => {
    if (el) {
      widgetRefs.current.set(widgetId, el);
    } else {
      widgetRefs.current.delete(widgetId);
    }
  }, []);

  const subscribe = useCallback((action: CrossLinkAction, handler: CrossLinkHandler) => {
    if (!subscribers.current.has(action)) {
      subscribers.current.set(action, new Set());
    }
    subscribers.current.get(action)!.add(handler);
    return () => {
      subscribers.current.get(action)?.delete(handler);
    };
  }, []);

  const emit = useCallback((event: CrossLinkEvent) => {
    // Notify subscribers for this action
    const handlers = subscribers.current.get(event.action);
    if (handlers) {
      for (const handler of handlers) {
        handler(event.payload);
      }
    }

    // Built-in scroll-to behavior for 'open-finder' and 'scroll-to-widget'
    if (event.action === 'open-finder') {
      const finderEl = widgetRefs.current.get('availability-finder');
      if (finderEl) {
        finderEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        finderEl.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
        setTimeout(() => {
          finderEl.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
        }, 2000);
      }
    } else if (event.action === 'scroll-to-widget') {
      const targetId = event.payload.widgetId as string;
      const el = widgetRefs.current.get(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, []);

  const value = useMemo(
    () => ({ emit, subscribe, registerWidgetRef }),
    [emit, subscribe, registerWidgetRef],
  );

  return <CrossLinkContext.Provider value={value}>{children}</CrossLinkContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useCrossLinks(): CrossLinkContextValue {
  const context = useContext(CrossLinkContext);
  if (!context) {
    throw new Error('useCrossLinks must be used within a CrossLinkProvider');
  }
  return context;
}

/**
 * Subscribe to a specific cross-link action type.
 * The handler is called with the event payload whenever the action is emitted.
 * Cleanup is automatic on unmount.
 */
export function useCrossLinkSubscription(action: CrossLinkAction, handler: CrossLinkHandler): void {
  const { subscribe } = useCrossLinks();

  useEffect(() => {
    return subscribe(action, handler);
  }, [subscribe, action, handler]);
}
