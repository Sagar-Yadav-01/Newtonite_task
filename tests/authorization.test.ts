import { describe, it, expect } from 'vitest';
import { request, getAuthToken, prisma } from './helpers';

describe('Server-Side Authorization Matrix', () => {
  it('allows Admin user to modify any team work item', async () => {
    const { authHeader } = await getAuthToken('admin@newtonite.com', 'password123');

    // Find any existing work item
    const item = await prisma.workItem.findFirst({ where: { deletedAt: null } });
    expect(item).not.toBeNull();

    const res = await request
      .patch(`/api/work-items/${item!.id}`)
      .set(authHeader)
      .send({
        version: item!.version,
        title: `${item!.title} (Admin Edit)`,
      });

    expect(res.status).toBe(200);
    expect(res.body.title).toContain('(Admin Edit)');
  });

  it('rejects non-member attempting to modify another team work item with 403 Forbidden', async () => {
    // Rahul is on Payments Team, not on Customer Operations team
    const { authHeader: rahulAuth } = await getAuthToken('rahul@newtonite.com', 'password123');

    // Find an Engineering team work item (where Rahul is NOT a member)
    const engTeam = await prisma.team.findUnique({ where: { name: 'Engineering' } });
    const engItem = await prisma.workItem.findFirst({
      where: { teamId: engTeam!.id, deletedAt: null },
    });

    expect(engItem).not.toBeNull();

    const res = await request
      .patch(`/api/work-items/${engItem!.id}`)
      .set(rahulAuth)
      .send({
        version: engItem!.version,
        title: 'Unauthorized Edit Attempt',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toContain("don't have permission");
  });

  it('rejects non-member attempting to create work item for a team they do not belong to', async () => {
    const { authHeader: rahulAuth } = await getAuthToken('rahul@newtonite.com', 'password123');
    const engTeam = await prisma.team.findUnique({ where: { name: 'Engineering' } });

    const res = await request
      .post('/api/work-items')
      .set(rahulAuth)
      .send({
        title: 'Unauthorized New Item',
        description: 'Should fail authorization check',
        teamId: engTeam!.id,
        priority: 'HIGH',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
