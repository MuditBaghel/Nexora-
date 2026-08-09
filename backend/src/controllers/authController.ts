import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService';
import { sendSuccess } from '../utils/response';
import { setRefreshCookie, clearRefreshCookie, getRefreshToken } from '../utils/cookies';
import { assertRequestOrigin } from '../utils/origin';

function getMeta(req: Request) {
  return {
    ip: req.ip ?? req.socket.remoteAddress ?? '',
    userAgent: req.headers['user-agent'] ?? '',
  };
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password, getMeta(req));
    setRefreshCookie(res, result.refreshToken);
    sendSuccess(res, { token: result.token, user: result.user });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    assertRequestOrigin(req);
    const refreshToken = getRefreshToken(req);
    const result = await authService.refresh(refreshToken, getMeta(req));
    setRefreshCookie(res, result.refreshToken);
    sendSuccess(res, { token: result.token, user: result.user });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    assertRequestOrigin(req);
    const refreshToken = getRefreshToken(req);
    await authService.logout(refreshToken, req.user?.userId, req.ip ?? '');
    clearRefreshCookie(res);
    sendSuccess(res, { message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getMe(req.user!.userId);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}
