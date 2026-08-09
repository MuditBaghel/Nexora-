import { env } from '../config/env';
import { AppError } from './response';

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  let hostname: string;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    return false;
  }
  if (env.NODE_ENV === 'production') {
    return origin === env.CORS_ORIGIN;
  }
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function assertRequestOrigin(req: { headers: { origin?: string } }): void {
  const origin = req.headers.origin;
  if (origin && !isAllowedOrigin(origin)) {
    throw new AppError('Origin not allowed', 403);
  }
}
