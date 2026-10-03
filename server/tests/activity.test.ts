import { describe, it, expect } from 'vitest';
import { request, getAuthToken, prisma } from './helpers';

describe('Immutable Activity Audit Trail', () => {
  it('returns chronological activity trail for a work item', async () => {
    const { authHeader } = await getAuthToken('admin@newtonite.com', 'password123');
    const item = await prisma.workItem.findFirst({ where: { deletedAt: null } });

    const res = await request
      .get(`/api/work-items/${item!.id}/activity`)
      .set(authHeader);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].action).toBeDefined();
    expect(res.body[0].user).toBeDefined();
  });
});
