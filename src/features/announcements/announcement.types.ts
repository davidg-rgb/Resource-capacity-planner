export type AnnouncementSeverity = 'info' | 'warning' | 'critical';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  severity: AnnouncementSeverity;
  targetOrgIds: string[] | null;
  startsAt: string;
  expiresAt: string | null;
  createdAt: string;
}
