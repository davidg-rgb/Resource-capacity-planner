'use client';

import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';

import type { Announcement, AnnouncementSeverity } from '@/features/announcements/announcement.types';

import { dismissAnnouncement, getDismissedIds } from './use-dismissed-announcements';

const SEVERITY_STYLES: Record<AnnouncementSeverity, string> = {
  critical: 'border-red-200 bg-red-50 text-red-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
};

export function AnnouncementBanner() {
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => getDismissedIds());

  const { data: announcements } = useQuery<Announcement[]>({
    queryKey: ['announcements', 'active'],
    queryFn: async () => {
      const r = await fetch('/api/announcements/active');
      if (!r.ok) throw new Error(`Announcements fetch failed: ${r.status}`);
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleDismiss = useCallback((id: string) => {
    dismissAnnouncement(id);
    setDismissedIds((prev) => [...prev, id]);
  }, []);

  if (!announcements || announcements.length === 0) return null;

  // Filter out dismissed announcements, but critical ones are always shown
  const visible = announcements.filter(
    (a) => a.severity === 'critical' || !dismissedIds.includes(a.id),
  );

  if (visible.length === 0) return null;

  // Show the first (highest severity) announcement
  const announcement = visible[0];
  const canDismiss = announcement.severity !== 'critical';

  return (
    <div
      className={`border-l-4 px-4 py-3 ${SEVERITY_STYLES[announcement.severity]}`}
      role="alert"
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <span className="font-semibold">{announcement.title}</span>
          {announcement.body && (
            <span className="ml-2 text-sm opacity-90">{announcement.body}</span>
          )}
        </div>
        {canDismiss && (
          <button
            onClick={() => handleDismiss(announcement.id)}
            className="ml-4 flex-shrink-0 rounded p-1 opacity-70 transition-opacity hover:opacity-100"
            aria-label="Dismiss announcement"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
