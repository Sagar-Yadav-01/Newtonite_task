import { describe, it, expect } from 'vitest';
import { prisma } from './helpers';
import { WorkItemService } from '../src/services/WorkItemService';

describe('Transaction Audit Consistency', () => {
  it('rolls back work item status update if transaction fails during activity logging', async () => {
    const team = await prisma.team.findFirst();
    const user = await prisma.user.findFirst();

    const item = await prisma.workItem.create({
      data: {
        title: 'Transaction Test Item',
        description: 'Testing transactional rollback',
        teamId: team!.id,
        createdById: user!.id,
        status: 'OPEN',
        version: 1,
      },
    });

    // Attempt a transaction where activity log throws due to a simulated DB failure or invalid foreign key constraint
    let caughtError: any = null;
    try {
      await prisma.$transaction(async (tx) => {
        // Step 1: Update status
        await tx.workItem.update({
          where: { id: item.id },
          data: { status: 'IN_PROGRESS', version: 2 },
        });

        // Step 2: Intentionally trigger a foreign key constraint violation during activity log creation
        await tx.activityLog.create({
          data: {
            workItemId: 'invalid-non-existent-work-item-id-12345', // Foreign key failure!
            userId: user!.id,
            action: 'STATUS_CHANGED',
          },
        });
      });
    } catch (err: any) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();

    // Verify DB work item was NOT updated and remains 'OPEN' (transaction rolled back)
    const freshItem = await prisma.workItem.findUnique({ where: { id: item.id } });
    expect(freshItem!.status).toBe('OPEN');
    expect(freshItem!.version).toBe(1);
  });
});
