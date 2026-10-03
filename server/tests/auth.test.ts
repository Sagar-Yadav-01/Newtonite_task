import { describe, it, expect } from 'vitest';
import { request, getAuthToken, prisma } from './helpers';

describe('Auth API & JWT Authentication', () => {
  it('registers a new user successfully', async () => {
    const res = await request.post('/api/auth/register').send({
      name: 'Test Engineer',
      email: `test_${Date.now()}@newtonite.com`,
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toContain('@newtonite.com');
  });

  it('authenticates user login and returns JWT token', async () => {
    const res = await request.post('/api/auth/login').send({
      email: 'admin@newtonite.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('ADMIN');
  });

  it('rejects login with invalid password', async () => {
    const res = await request.post('/api/auth/login').send({
      email: 'admin@newtonite.com',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns current user profile for authenticated request', async () => {
    const { authHeader } = await getAuthToken('rahul@newtonite.com', 'password123');
    const res = await request.get('/api/auth/me').set(authHeader);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('rahul@newtonite.com');
  });

  it('rejects protected routes without JWT header', async () => {
    const res = await request.get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('prevents self-promotion during registration', async () => {
    const email = `attacker_${Date.now()}@example.com`;
    const res = await request.post('/api/auth/register').send({
      name: 'Attacker',
      email,
      password: 'Password123!',
      role: 'ADMIN',
    });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('MEMBER');

    const dbUser = await prisma.user.findUnique({ where: { email } });
    expect(dbUser).not.toBeNull();
    expect(dbUser?.role).toBe('MEMBER');
  });

  it('prevents MEMBER from promoting themselves to ADMIN', async () => {
    const { authHeader, user } = await getAuthToken('rahul@newtonite.com', 'password123');
    const res = await request
      .patch(`/api/users/${user.id}`)
      .set(authHeader)
      .send({ role: 'ADMIN' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser?.role).toBe('MEMBER');
  });

  it('prevents MEMBER from promoting another user to ADMIN', async () => {
    const { authHeader: rahulAuth } = await getAuthToken('rahul@newtonite.com', 'password123');
    const priya = await prisma.user.findUnique({ where: { email: 'priya@newtonite.com' } });
    expect(priya).not.toBeNull();

    const res = await request
      .patch(`/api/users/${priya!.id}`)
      .set(rahulAuth)
      .send({ role: 'ADMIN' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');

    const dbUser = await prisma.user.findUnique({ where: { id: priya!.id } });
    expect(dbUser?.role).toBe('MEMBER');
  });

  it('verifies existing Admin account retains ADMIN role and can authenticate', async () => {
    const { authHeader, user } = await getAuthToken('admin@newtonite.com', 'password123');
    expect(user.role).toBe('ADMIN');

    const res = await request.get('/api/auth/me').set(authHeader);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('ADMIN');
  });
});
