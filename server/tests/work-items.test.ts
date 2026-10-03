import { describe, it, expect } from 'vitest';
import { request, getAuthToken, prisma } from './helpers';

describe('Work Item CRUD & Archiving', () => {
  it('creates, reads, updates, and soft-deletes a work item', async () => {
    const { authHeader } = await getAuthToken('admin@newtonite.com', 'password123');
    const team = await prisma.team.findFirst();

    const createRes = await request
      .post('/api/work-items')
      .set(authHeader)
      .send({
        title: 'Full Lifecycle Work Item',
        description: 'Testing standard CRUD lifecycle',
        teamId: team!.id,
        priority: 'MEDIUM',
        status: 'OPEN',
      });

    expect(createRes.status).toBe(201);
    const itemId = createRes.body.id;

    const detailRes = await request.get(`/api/work-items/${itemId}`).set(authHeader);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.title).toBe('Full Lifecycle Work Item');

    const updateRes = await request
      .patch(`/api/work-items/${itemId}`)
      .set(authHeader)
      .send({
        version: 1,
        priority: 'URGENT',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.priority).toBe('URGENT');
    expect(updateRes.body.version).toBe(2);

    const deleteRes = await request.delete(`/api/work-items/${itemId}`).set(authHeader);
    expect(deleteRes.status).toBe(200);

    const listRes = await request.get('/api/work-items').set(authHeader);
    const ids = listRes.body.items.map((i: any) => i.id);
    expect(ids).not.toContain(itemId);
  });
});
