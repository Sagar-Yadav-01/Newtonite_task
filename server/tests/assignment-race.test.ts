import { describe, it, expect } from 'vitest';
import { request, getAuthToken, prisma } from './helpers';

describe('Atomic Assignment Race Protection', () => {
  it('ensures exactly one user wins assignment race on an unassigned work item', async () => {
    const { authHeader: rahulAuth, user: rahul } = await getAuthToken('rahul@newtonite.com', 'password123');
    const { authHeader: adminAuth, user: admin } = await getAuthToken('admin@newtonite.com', 'password123');

    const paymentsTeam = await prisma.team.findUnique({ where: { name: 'Payments' } });

    const unassignedItem = await prisma.workItem.create({
      data: {
        title: 'Concurrent Race Test Item',
        description: 'Testing parallel assignment race condition',
        teamId: paymentsTeam!.id,
        assigneeId: null,
        createdById: admin.id,
        version: 1,
      },
    });

    const [resA, resB] = await Promise.all([
      request
        .post(`/api/work-items/${unassignedItem.id}/assign`)
        .set(rahulAuth)
        .send({ assigneeId: rahul.id, version: 1 }),
      request
        .post(`/api/work-items/${unassignedItem.id}/assign`)
        .set(adminAuth)
        .send({ assigneeId: admin.id, version: 1 }),
    ]);

    const statuses = [resA.status, resB.status];
    expect(statuses).toContain(200);
    expect(statuses).toContain(409);

    const finalItem = await prisma.workItem.findUnique({ where: { id: unassignedItem.id } });
    expect(finalItem!.assigneeId).not.toBeNull();
    expect(finalItem!.version).toBe(2);
  });
});
