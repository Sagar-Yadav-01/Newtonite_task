import { describe, it, expect } from 'vitest';
import { request, getAuthToken, prisma } from './helpers';

describe('Idempotency Duplicate Request Protection', () => {
  it('prevents duplicate item creation when identical Idempotency-Key is reused', async () => {
    const { authHeader } = await getAuthToken('admin@newtonite.com', 'password123');
    const team = await prisma.team.findFirst();

    const timestamp = Date.now();
    const idempotencyKey = `key_test_${timestamp}`;
    const testTitle = `Idempotency Creation Test ${timestamp}`;

    const payload = {
      title: testTitle,
      description: 'Testing duplicate request protection',
      teamId: team!.id,
      priority: 'HIGH',
    };

    // First Request
    const res1 = await request
      .post('/api/work-items')
      .set(authHeader)
      .set('Idempotency-Key', idempotencyKey)
      .send(payload);

    expect(res1.status).toBe(201);
    const createdId = res1.body.id;

    // Second Request with identical key and payload
    const res2 = await request
      .post('/api/work-items')
      .set(authHeader)
      .set('Idempotency-Key', idempotencyKey)
      .send(payload);

    expect(res2.status).toBe(201);
    expect(res2.body.id).toBe(createdId);

    // Verify only ONE work item exists in DB with this specific title
    const count = await prisma.workItem.count({
      where: { title: testTitle },
    });
    expect(count).toBe(1);
  });

  it('returns 409 Conflict when Idempotency-Key is reused with a different request payload', async () => {
    const { authHeader } = await getAuthToken('admin@newtonite.com', 'password123');
    const team = await prisma.team.findFirst();

    const idempotencyKey = `key_reuse_${Date.now()}`;

    await request
      .post('/api/work-items')
      .set(authHeader)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        title: 'Original Payload Title',
        description: 'Original description content',
        teamId: team!.id,
      });

    const res2 = await request
      .post('/api/work-items')
      .set(authHeader)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        title: 'Modified Payload Title',
        description: 'Different description content',
        teamId: team!.id,
      });

    expect(res2.status).toBe(409);
    expect(res2.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });
});
