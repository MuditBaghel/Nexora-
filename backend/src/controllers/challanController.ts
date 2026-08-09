import { Request, Response, NextFunction } from 'express';
import * as challanService from '../services/challanService';
import { sendSuccess } from '../utils/response';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await challanService.listChallans(req.query as never);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const challan = await challanService.getChallan(req.params.id);
    sendSuccess(res, challan);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { customer_id, items } = req.body;
    const challan = await challanService.createChallan(customer_id, items, req.user!.userId);
    sendSuccess(res, challan, 201);
  } catch (err) {
    next(err);
  }
}

export async function confirm(req: Request, res: Response, next: NextFunction) {
  try {
    const challan = await challanService.confirmChallan(req.params.id, req.user!.userId);
    sendSuccess(res, challan);
  } catch (err) {
    next(err);
  }
}

export async function cancel(req: Request, res: Response, next: NextFunction) {
  try {
    const challan = await challanService.cancelChallan(req.params.id, req.user!.userId);
    sendSuccess(res, challan);
  } catch (err) {
    next(err);
  }
}
