import crypto from 'crypto';
import { query, queryOne } from '../db/pool';
import { AppError } from '../utils/response';
import { env } from '../config/env';
import { parseDurationToMs } from '../utils/duration';

export interface SessionResult {
  token: string;
  sessionId: string;
  expiresAt: Date;
}

export type UserRole = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface SessionRow {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  revoked_at: string | null;
  expires_at: string;
  refresh_token_hash: string;
  previous_refresh_token_hash: string | null;
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

export async function createSession(
  userId: string,
  ip: string,
  userAgent: string
): Promise<SessionResult> {
  const token = generateRefreshToken();
  const expiresAt = new Date(Date.now() + parseDurationToMs(env.REFRESH_TOKEN_EXPIRES_IN));
  const rows = await query<{ id: string }>(
    `INSERT INTO sessions (user_id, refresh_token_hash, user_agent, ip, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [userId, sha256(token), userAgent, ip, expiresAt]
  );
  return { token, sessionId: rows[0].id, expiresAt };
}

export async function rotateSession(
  refreshToken: string,
  ip: string,
  userAgent: string
): Promise<{ user: SessionUser; session: SessionResult }> {
  const hash = sha256(refreshToken);
  const row = await queryOne<SessionRow>(
    `SELECT s.id, s.user_id AS user_id, s.revoked_at, s.expires_at,
            s.refresh_token_hash, s.previous_refresh_token_hash,
            u.name, u.email, u.role
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.refresh_token_hash = $1 OR s.previous_refresh_token_hash = $1`,
    [hash]
  );

  if (!row) {
    throw new AppError('Invalid refresh token', 401);
  }

  // Reuse of a previously rotated token indicates theft — revoke the family.
  if (row.previous_refresh_token_hash === hash) {
    await query('UPDATE sessions SET revoked_at = NOW() WHERE id = $1', [row.id]);
    throw new AppError('Refresh token reuse detected', 401);
  }

  if (row.revoked_at) {
    throw new AppError('Session revoked', 401);
  }
  if (new Date(row.expires_at) < new Date()) {
    throw new AppError('Session expired', 401);
  }

  const newToken = generateRefreshToken();
  const newHash = sha256(newToken);
  const expiresAt = new Date(Date.now() + parseDurationToMs(env.REFRESH_TOKEN_EXPIRES_IN));

  await query(
    `UPDATE sessions
     SET previous_refresh_token_hash = refresh_token_hash,
         refresh_token_hash = $1,
         expires_at = $2,
         ip = $3,
         user_agent = $4
     WHERE id = $5`,
    [newHash, expiresAt, ip, userAgent, row.id]
  );

  return {
    user: { id: row.user_id, name: row.name, email: row.email, role: row.role },
    session: { token: newToken, sessionId: row.id, expiresAt },
  };
}

export async function revokeSession(refreshToken: string): Promise<void> {
  if (!refreshToken) return;
  await query(
    'UPDATE sessions SET revoked_at = NOW() WHERE refresh_token_hash = $1 AND revoked_at IS NULL',
    [sha256(refreshToken)]
  );
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await query('UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
}

export async function cleanupExpiredSessions(): Promise<void> {
  await query(
    'DELETE FROM sessions WHERE expires_at < NOW() OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL \'30 days\')'
  );
}
