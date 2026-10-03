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

  let keyRecord: any = null;
  let isOwner = false;

  try {
    // Authoritative race protection: attempt atomic database creation
    keyRecord = await prisma.idempotencyKey.create({
      data: {
        key: idempotencyKey,
        userId,
        requestHash,
        responseStatus: 0, // 0 indicates request is currently in-flight
        responseBody: '',
      },
    });
    isOwner = true;
  } catch (err: any) {
    if (err.code === 'P2002') {
      // Unique constraint failed: key already exists or is currently processing
      keyRecord = await prisma.idempotencyKey.findUnique({
        where: {
          userId_key: {
            userId,
            key: idempotencyKey,
          },
        },
      });
    } else {
      return next(err);
    }
  }

  if (!keyRecord) {
    return next(ConflictError('Idempotency processing error', 'IDEMPOTENCY_ERROR'));
  }

  // Validate payload hash mismatch
  if (keyRecord.requestHash !== requestHash) {
    return next(
      ConflictError(
        'This idempotency key was already used with a different request payload.',
        'IDEMPOTENCY_KEY_REUSED'
      )
    );
  }

  // Non-owner requests: if key record is already completed, return cached response
  if (!isOwner && keyRecord.responseStatus !== 0) {
    const cachedBody = JSON.parse(keyRecord.responseBody);
    return res.status(keyRecord.responseStatus).json(cachedBody);
  }

  // Non-owner requests: if key record is currently in-flight (responseStatus === 0), wait/poll for completion
  if (!isOwner && keyRecord.responseStatus === 0) {
    let attempts = 0;
    while (keyRecord && keyRecord.responseStatus === 0 && attempts < 60) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      attempts++;
      const refreshed = await prisma.idempotencyKey.findUnique({
        where: {
          userId_key: {
            userId,
            key: idempotencyKey,
          },
        },
      });
      if (!refreshed) break;
      keyRecord = refreshed;
    }

    if (!keyRecord || keyRecord.responseStatus === 0) {
      return next(ConflictError('Concurrent request timeout. Please try again.', 'CONCURRENT_TIMEOUT'));
    }

    if (keyRecord.requestHash !== requestHash) {
      return next(
        ConflictError(
          'This idempotency key was already used with a different request payload.',
          'IDEMPOTENCY_KEY_REUSED'
        )
      );
    }

    const cachedBody = JSON.parse(keyRecord.responseBody);
    return res.status(keyRecord.responseStatus).json(cachedBody);
  }

  // Owner request: intercept res.json to await database persistence before flushing response
  const originalJson = res.json.bind(res);
  res.json = function (body: any): Response {
    res.json = originalJson;

    const savePromise = (async () => {
      try {
        if (res.statusCode >= 500) {
          await prisma.idempotencyKey
            .delete({
              where: {
                userId_key: {
                  userId,
                  key: idempotencyKey,
                },
              },
            })
            .catch(() => {});
        } else {
          await prisma.idempotencyKey.update({
            where: {
              userId_key: {
                userId,
                key: idempotencyKey,
              },
            },
            data: {
              responseStatus: res.statusCode,
              responseBody: JSON.stringify(body),
            },
          });
        }
      } catch (err) {
        console.error('[IDEMPOTENCY_SAVE_ERROR]', err);
      }
    })();

    savePromise.finally(() => {
      originalJson(body);
    });

    return res;
  };

  next();
}

