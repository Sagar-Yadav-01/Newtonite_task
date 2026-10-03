import supertest from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/utils/prisma';

export const request = supertest(app);

export async function getAuthToken(email = 'admin@newtonite.com', password = 'password123') {
  const res = await request.post('/api/auth/login').send({ email, password });
  return {
    token: res.body.token as string,
    user: res.body.user,
    authHeader: { Authorization: `Bearer ${res.body.token}` },
  };
}

export { prisma };
