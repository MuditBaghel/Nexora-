import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = crypto.randomUUID();
  const start = Date.now();
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const line = {
      level: 'info',
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - start,
      ip: req.ip ?? '',
      userId: (req as Request & { user?: { userId?: string } }).user?.userId ?? null,
    };
    console.log(JSON.stringify(line));
  });

  next();
}
