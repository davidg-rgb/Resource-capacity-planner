import { z } from 'zod';

export const suspendSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const subscriptionUpdateSchema = z.object({
  subscriptionStatus: z
    .enum(['trial', 'active', 'past_due', 'cancelled', 'suspended'])
    .optional(),
  trialEndsAt: z.string().datetime().optional(),
  platformNotes: z.string().max(2000).optional(),
});
