import { describe, it, expect, vi } from 'vitest';
import { request, getAuthToken, prisma } from './helpers';

describe('Transaction Audit Consistency', () => {
  it('rolls back work item status update if activity log transaction fails', async () => {
    const { authHeader } = await getAuthToken('admin@newtonite.com', 'password123');
    const team = await prisma.team.findFirst();

    const item = await prisma.workItem.create({
      data: {
        title: 'Transaction Test Item',
        description: 'Testing transactional rollback',
        teamId: team!.id,
        createdById: (await prisma.user.findFirst())!.id,
        status: 'OPEN',
        version: 1,
      },
    });

    // Mock prisma.activityLog.create inside transaction to throw an unexpected error
    const spy = vi.spyOn(prisma.activityLog, 'create').mockRejectedValueOnce(
      new Error('Simulated Database Failure During Activity Logging')
    );

    const res = await request
      .patch(`/api/work-items/${item.id}/status`)
      .set(authHeader)
      .send({ status: 'IN_PROGRESS', version: 1 });

    expect(res.status).toBe(500);

    // Verify DB work item was NOT updated and remains 'OPEN' (transaction rolled back)
    const freshItem = await prisma.workItem.findUnique({ where: { id: item.id } });
    expect(freshItem!.status).toBe('OPEN');
    expect(freshItem!.version).toBe(1);

    spy.mockRestore();
  });
});
