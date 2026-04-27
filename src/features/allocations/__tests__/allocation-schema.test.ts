import { describe, expect, it } from 'vitest';

import { allocationUpsertSchema } from '../allocation.schema';

describe('allocationUpsertSchema — hours bounds (CONS-P1-02)', () => {
  const baseInput = {
    personId: '11111111-1111-4111-8111-111111111111',
    projectId: '22222222-2222-4222-8222-222222222222',
    month: '2026-04',
  };

  it('accepts hours up to 744 (max month-hours)', () => {
    const result = allocationUpsertSchema.safeParse({ ...baseInput, hours: 744 });
    expect(result.success).toBe(true);
  });

  it('rejects hours of 745 (above documented cap of 744)', () => {
    const result = allocationUpsertSchema.safeParse({ ...baseInput, hours: 745 });
    expect(result.success).toBe(false);
  });

  it('rejects hours of 999 (legacy cap, no longer allowed)', () => {
    const result = allocationUpsertSchema.safeParse({ ...baseInput, hours: 999 });
    expect(result.success).toBe(false);
  });

  it('accepts 0 hours (DELETE semantics)', () => {
    const result = allocationUpsertSchema.safeParse({ ...baseInput, hours: 0 });
    expect(result.success).toBe(true);
  });

  it('rejects negative hours', () => {
    const result = allocationUpsertSchema.safeParse({ ...baseInput, hours: -1 });
    expect(result.success).toBe(false);
  });
});
