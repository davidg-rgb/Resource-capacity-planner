// RV-02: regression test — POST /api/projects and PATCH /api/projects/[id]
// require role >= admin. A planner-role user must get 403.

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

vi.mock('@/features/projects/project.service', () => ({
  listProjects: vi.fn(),
  createProject: vi.fn(),
  getProject: vi.fn(),
  updateProject: vi.fn(),
  archiveProject: vi.fn(),
}));

const { auth } = await import('@clerk/nextjs/server');
const authMock = auth as unknown as ReturnType<typeof vi.fn>;

describe('RV-02 — RBAC: projects register requires admin+', () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('POST /api/projects: planner role → 403 ForbiddenError', async () => {
    authMock.mockResolvedValue({
      userId: 'user_test',
      orgId: 'org_clerk_1',
      orgRole: 'org:planner',
    });

    const { POST } = await import('../../projects/route');
    const req = new Request('http://localhost/api/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Test', status: 'active' }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(403);
  });

  it('PATCH /api/projects/[id]: planner role → 403 ForbiddenError', async () => {
    authMock.mockResolvedValue({
      userId: 'user_test',
      orgId: 'org_clerk_1',
      orgRole: 'org:planner',
    });

    const { PATCH } = await import('../../projects/[id]/route');
    const req = new Request('http://localhost/api/projects/abc', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'New' }),
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
