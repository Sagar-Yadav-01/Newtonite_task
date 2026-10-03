import { describe, it, expect } from 'vitest';
import { request, getAuthToken } from './helpers';

describe('Server-Side Pagination', () => {
  it('returns items and structured pagination metadata', async () => {
    const { authHeader } = await getAuthToken('admin@newtonite.com', 'password123');

    const res = await request
      .get('/api/work-items?page=1&pageSize=2')
      .set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.pageSize).toBe(2);
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
    expect(res.body.items.length).toBeLessThanOrEqual(2);
  });

  it('clamps excessive pageSize values to maximum limit of 100', async () => {
    const { authHeader } = await getAuthToken('admin@newtonite.com', 'password123');

    const res = await request
      .get('/api/work-items?page=1&pageSize=500')
      .set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body.pagination.pageSize).toBe(100);
  });
});
