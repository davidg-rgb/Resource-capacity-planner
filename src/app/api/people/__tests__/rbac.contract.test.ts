// RV-02: regression test — POST /api/people and PATCH /api/people/[id]
// require role >= admin. A planner-role user must get 403.
//
// Mocks `@clerk/nextjs/server` to return a planner role; the route handler
// should hit ForbiddenError before ever touching the DB, so we can assert
// status 403 without standing up a real DB.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: 'org-uuid-1' }],
        }),
      }),
    }),
  },
}));

vi.mock('@/features/people/people.service', () => ({
  listPeople: vi.fn(),
  createPerson: vi.fn(),
  getPerson: vi.fn(),
  updatePerson: vi.fn(),
  archivePerson: vi.fn(),
}));

const { auth } = await import('@clerk/nextjs/server');
const authMock = auth as unknown as ReturnType<typeof vi.fn>;

describe('RV-02 — RBAC: people register requires admin+', () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('POST /api/people: planner role → 403 ForbiddenError', async () => {
    authMock.mockResolvedValue({
      userId: 'user_test',
      orgId: 'org_clerk_1',
      orgRole: 'org:planner',
    });

    const { POST } = await import('../../people/route');
    const req = new Request('http://localhost/api/people', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        firstName: 'X',
        lastName: 'Y',
        email: 'x@y.com',
        capacity: 160,
      }),
    });

    // The handler signature requires NextRequest; cast through unknown to
    // satisfy the test harness without standing up a full Next runtime.
    const res = await POST(req as never);
    expect(res.status).toBe(403);
  });

  it('PATCH /api/people/[id]: planner role → 403 ForbiddenError', async () => {
    authMock.mockResolvedValue({
      userId: 'user_test',
      orgId: 'org_clerk_1',
      orgRole: 'org:planner',
    });

    const { PATCH } = await import('../../people/[id]/route');
    const req = new Request('http://localhost/api/people/abc', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ firstName: 'Z' }),
    });

    const res = await PATCH(
      req as never,
      {
        params: Promise.resolve({ id: 'abc' }),
      } as never,
    );
    expect(res.status).toBe(403);
  });
});
