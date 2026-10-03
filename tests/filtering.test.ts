import { describe, it, expect } from 'vitest';
import { request, getAuthToken, prisma } from './helpers';

describe('Server-Side Search & Filtering', () => {
  it('filters work items by search keyword in title or description', async () => {
    const { authHeader } = await getAuthToken('admin@newtonite.com', 'password123');

    const res = await request
      .get('/api/work-items?search=Timeout')
      .set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.items[0].title).toContain('Timeout');
  });

  it('filters work items by status and priority combined', async () => {
    const { authHeader } = await getAuthToken('admin@newtonite.com', 'password123');

    const res = await request
      .get('/api/work-items?status=BLOCKED&priority=URGENT')
      .set(authHeader);

    expect(res.status).toBe(200);
    for (const item of res.body.items) {
      expect(item.status).toBe('BLOCKED');
      expect(item.priority).toBe('URGENT');
    }
  });

  it('filters work items by myWork preset filter', async () => {
    const { authHeader, user } = await getAuthToken('rahul@newtonite.com', 'password123');

    const res = await request
      .get('/api/work-items?filterType=myWork')
      .set(authHeader);

    expect(res.status).toBe(200);
    for (const item of res.body.items) {
      expect(item.assigneeId).toBe(user.id);
    }
  });
});
