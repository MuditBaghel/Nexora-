import { env } from '../config/env';
import { AppError } from './response';

const allowedOrigins = env.CORS_ORIGIN.split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  let hostname: string;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    return false;
  }
  if (env.NODE_ENV === 'production') {
    return allowedOrigins.includes(origin);
  }
  return isLocalHostname(hostname) || allowedOrigins.includes(origin);
}

export function assertRequestOrigin(req: { headers: { origin?: string } }): void {
  const origin = req.headers.origin;
  if (origin && !isAllowedOrigin(origin)) {
    throw new AppError('Origin not allowed', 403);
  }
}
