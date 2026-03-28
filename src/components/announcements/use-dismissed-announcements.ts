const STORAGE_KEY = 'dismissed_announcements';
const MAX_DISMISSED = 50;

/**
 * Get the list of dismissed announcement IDs from localStorage.
 * Returns an empty array during SSR or if localStorage is unavailable.
 */
export function getDismissedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Add an announcement ID to the dismissed list in localStorage.
 * Caps at MAX_DISMISSED entries to prevent unbounded growth.
 */
export function dismissAnnouncement(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    let current = getDismissedIds();
    if (current.includes(id)) return;
    current = [...current, id];
    // Prune oldest entries if over cap
    if (current.length > MAX_DISMISSED) {
      current = current.slice(current.length - MAX_DISMISSED);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Silently fail if localStorage is full or unavailable
  }
}
