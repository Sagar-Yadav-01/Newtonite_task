import { describe, it, expect } from 'vitest';
import { request, getAuthToken } from './helpers';

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
});
