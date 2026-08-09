import { Request, Response, NextFunction } from 'express';
import * as stockService from '../services/stockService';
import { sendSuccess } from '../utils/response';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await stockService.listStockMovements(req.query as never);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { product_id, quantity, movement_type, reason } = req.body;
    const movement = await stockService.createStockMovement(
      product_id,
      quantity,
      movement_type,
      reason,
      req.user!.userId
    );
    sendSuccess(res, movement, 201);
  } catch (err) {
    next(err);
  }
}
