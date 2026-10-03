import { describe, it, expect } from 'vitest';
import { request, getAuthToken, prisma } from './helpers';

describe('Optimistic Concurrency Control (OCC)', () => {
  it('rejects stale version update with 409 Conflict', async () => {
    const { authHeader } = await getAuthToken('admin@newtonite.com', 'password123');

    const team = await prisma.team.findFirst();
    const item = await prisma.workItem.create({
      data: {
        title: 'OCC Test Work Item',
        description: 'Testing optimistic locking',
        teamId: team!.id,
        createdById: (await prisma.user.findFirst())!.id,
        version: 1,
      },
    });

    const initialVersion = item.version;

    const updateARes = await request
      .patch(`/api/work-items/${item.id}`)
      .set(authHeader)
      .send({
        version: initialVersion,
        title: 'Title Updated by User A',
      });

    expect(updateARes.status).toBe(200);
    expect(updateARes.body.version).toBe(2);

    const updateBRes = await request
      .patch(`/api/work-items/${item.id}`)
      .set(authHeader)
      .send({
        version: initialVersion,
        title: 'Title Updated by User B',
      });

    expect(updateBRes.status).toBe(409);
    expect(updateBRes.body.error.code).toBe('VERSION_CONFLICT');
    expect(updateBRes.body.error.message).toContain('modified by another user');

    const freshItem = await prisma.workItem.findUnique({ where: { id: item.id } });
    expect(freshItem!.title).toBe('Title Updated by User A');
    expect(freshItem!.version).toBe(2);
  });
});
