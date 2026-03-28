const STORAGE_KEY = 'dismissed_announcements';

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
 */
export function dismissAnnouncement(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getDismissedIds();
    if (!current.includes(id)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...current, id]));
    }
  } catch {
    // Silently fail if localStorage is full or unavailable
  }
}
