import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  body: z.string().min(1, 'Body is required').max(2000, 'Body must be 2000 characters or less'),
  severity: z.enum(['info', 'warning', 'critical']),
  targetOrgIds: z.array(z.string().uuid()).optional(),
  startsAt: z.string().datetime({ message: 'startsAt must be a valid ISO date string' }),
  expiresAt: z
    .string()
    .datetime({ message: 'expiresAt must be a valid ISO date string' })
    .optional()
    .nullable(),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial();
