import { Request, Response, NextFunction } from 'express';
import createHash from 'crypto';
import { prisma } from '../utils/prisma';
import { ConflictError } from '../utils/errors';

export async function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const idempotencyKey = req.header('Idempotency-Key') || req.header('X-Idempotency-Key');

  // If no idempotency key or not a mutating POST/PUT/PATCH request, proceed normally
  if (!idempotencyKey || req.method === 'GET' || !req.user) {
    return next();
  }

  const userId = req.user.id;
  const requestBodyStr = JSON.stringify(req.body || {});
  const requestHash = createHash.createHash('sha256').update(requestBodyStr).digest('hex');

  try {
    const existingKey = await prisma.idempotencyKey.findUnique({
      where: {
        userId_key: {
          userId,
          key: idempotencyKey,
        },
      },
    });

    if (existingKey) {
      if (existingKey.requestHash !== requestHash) {
        throw ConflictError(
          'This idempotency key was already used with a different request payload.',
          'IDEMPOTENCY_KEY_REUSED'
        );
      }

      // Return cached response
      const cachedBody = JSON.parse(existingKey.responseBody);
      return res.status(existingKey.responseStatus).json(cachedBody);
    }

    // Intercept res.json to capture and await idempotency key persistence
    const originalJson = res.json.bind(res);
    res.json = function (body: any): Response {
      // Restore original res.json
      res.json = originalJson;

      // Save idempotency record before sending response to client
      if (res.statusCode >= 200 && res.statusCode < 300) {
        prisma.idempotencyKey
          .create({
            data: {
              key: idempotencyKey,
              userId,
              requestHash,
              responseStatus: res.statusCode,
              responseBody: JSON.stringify(body),
            },
          })
          .then(() => {
            originalJson(body);
          })
          .catch((err) => {
            console.error('[IDEMPOTENCY_SAVE_ERROR]', err);
            originalJson(body);
          });
        return res;
      }

      return originalJson(body);
    };

    next();
  } catch (err) {
    next(err);
  }
}
