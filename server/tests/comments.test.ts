import { describe, it, expect } from 'vitest';
import { request, getAuthToken, prisma } from './helpers';

describe('Comments API & Integration', () => {
  it('allows adding, reading, updating, and deleting comments on work items', async () => {
    const { authHeader } = await getAuthToken('admin@newtonite.com', 'password123');
    const item = await prisma.workItem.findFirst({ where: { deletedAt: null } });

    const addRes = await request
      .post(`/api/work-items/${item!.id}/comments`)
      .set(authHeader)
      .send({ content: 'Initial investigation comment' });

    expect(addRes.status).toBe(201);
    const commentId = addRes.body.id;

    const getRes = await request.get(`/api/work-items/${item!.id}/comments`).set(authHeader);
    expect(getRes.status).toBe(200);
    const found = getRes.body.find((c: any) => c.id === commentId);
    expect(found).toBeDefined();

    const updateRes = await request
      .patch(`/api/comments/${commentId}`)
      .set(authHeader)
      .send({ content: 'Updated investigation comment' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.content).toBe('Updated investigation comment');

    const deleteRes = await request.delete(`/api/comments/${commentId}`).set(authHeader);
    expect(deleteRes.status).toBe(200);
  });
});
