import { Response } from 'express';

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: string[];
  available?: number;
  requested?: number;
}

export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data } satisfies ApiSuccessResponse<T>);
}

export function sendError(
  res: Response,
  message: string,
  status = 400,
  extra?: Partial<ApiErrorResponse>
): void {
  res.status(status).json({ success: false, message, ...extra } satisfies ApiErrorResponse);
}

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode = 400,
    public errors?: string[],
    public extra?: Partial<ApiErrorResponse>
  ) {
    super(message);
    this.name = 'AppError';
  }
}
