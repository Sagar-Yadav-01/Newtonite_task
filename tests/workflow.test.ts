import { describe, it, expect } from 'vitest';
import { request, getAuthToken, prisma } from './helpers';

describe('Workflow State Machine Enforcement', () => {
  it('allows valid status transition OPEN -> IN_PROGRESS', async () => {
    const { authHeader } = await getAuthToken('admin@newtonite.com', 'password123');
    const team = await prisma.team.findFirst();

    const item = await prisma.workItem.create({
      data: {
        title: 'Workflow Test Item',
        description: 'Testing state transitions',
        teamId: team!.id,
        createdById: (await prisma.user.findFirst())!.id,
        status: 'OPEN',
        version: 1,
      },
    });

    const res = await request
      .patch(`/api/work-items/${item.id}/status`)
      .set(authHeader)
      .send({ status: 'IN_PROGRESS', version: 1 });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('IN_PROGRESS');
  });

  it('rejects invalid status transition CLOSED -> BLOCKED with 400 Bad Request', async () => {
    const { authHeader } = await getAuthToken('admin@newtonite.com', 'password123');
    const team = await prisma.team.findFirst();

    const closedItem = await prisma.workItem.create({
      data: {
        title: 'Closed Item',
        description: 'Already completed item',
        teamId: team!.id,
        createdById: (await prisma.user.findFirst())!.id,
        status: 'CLOSED',
        version: 1,
      },
    });

    const res = await request
      .patch(`/api/work-items/${closedItem.id}/status`)
      .set(authHeader)
      .send({ status: 'BLOCKED', version: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_WORKFLOW_TRANSITION');
    expect(res.body.error.message).toContain('Cannot transition work item status from CLOSED to BLOCKED');
  });
});
