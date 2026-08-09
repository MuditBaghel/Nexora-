import bcrypt from 'bcryptjs';
import { query, queryOne } from '../db/pool';
import { signToken } from '../utils/jwt';
import { AppError } from '../utils/response';
import { createSession, rotateSession, revokeSession } from './sessionService';
import { logAudit } from './auditService';

export const LOGIN_MAX_ATTEMPTS = 10;
export const LOCKOUT_DURATION_MINUTES = 15;

export type UserRole = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  failed_login_count: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

interface AuthMeta {
  ip?: string;
  userAgent?: string;
}

function toSafeUser(user: UserRow): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

export async function login(email: string, password: string, meta: AuthMeta = {}) {
  const user = await queryOne<UserRow>(
    'SELECT * FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (user && user.locked_until && new Date(user.locked_until) > new Date()) {
    throw new AppError('Account temporarily locked. Try again later.', 423);
  }

  const valid = user ? await bcrypt.compare(password, user.password_hash) : false;

  if (!user || !valid) {
    if (user) {
      const count = (user.failed_login_count ?? 0) + 1;
      if (count >= LOGIN_MAX_ATTEMPTS) {
        await query(
          `UPDATE users SET failed_login_count = 0,
            locked_until = NOW() + ($2 || ' minutes')::interval
           WHERE id = $1`,
          [user.id, LOCKOUT_DURATION_MINUTES]
        );
        await logAudit({
          userId: user.id,
          action: 'auth.lockout',
          entity: 'user',
          entityId: user.id,
          details: { reason: 'max_login_attempts', ip: meta.ip ?? '' },
          ip: meta.ip,
        });
      } else {
        await query('UPDATE users SET failed_login_count = $1 WHERE id = $2', [count, user.id]);
      }
      await logAudit({
        userId: user.id,
        action: 'auth.login_failed',
        entity: 'user',
        entityId: user.id,
        details: { ip: meta.ip ?? '' },
        ip: meta.ip,
      });
    }
    throw new AppError('Invalid email or password', 401);
  }

  await query('UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = $1', [user.id]);

  const session = await createSession(user.id, meta.ip ?? '', meta.userAgent ?? '');
  const token = signToken({ userId: user.id, email: user.email, role: user.role });

  await logAudit({
    userId: user.id,
    action: 'auth.login',
    entity: 'user',
    entityId: user.id,
    details: { sessionId: session.sessionId, ip: meta.ip ?? '' },
    ip: meta.ip,
  });

  return { token, user: toSafeUser(user), refreshToken: session.token };
}

export async function refresh(refreshToken: string | undefined, meta: AuthMeta = {}) {
  if (!refreshToken) {
    throw new AppError('No refresh token provided', 401);
  }
  const { user, session } = await rotateSession(refreshToken, meta.ip ?? '', meta.userAgent ?? '');
  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  return {
    token,
    user,
    refreshToken: session.token,
  };
}

export async function logout(refreshToken: string | undefined, userId?: string, ip?: string) {
  await revokeSession(refreshToken ?? '');
  if (userId) {
    await logAudit({ userId, action: 'auth.logout', entity: 'user', entityId: userId, ip });
  }
}

export async function getMe(userId: string): Promise<SafeUser> {
  const user = await queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [userId]);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return toSafeUser(user);
}
