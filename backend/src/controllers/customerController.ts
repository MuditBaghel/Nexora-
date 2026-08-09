import { Request, Response, NextFunction } from 'express';
import * as customerService from '../services/customerService';
import { sendSuccess } from '../utils/response';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await customerService.listCustomers(req.query as never);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = await customerService.getCustomer(req.params.id);
    sendSuccess(res, customer);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = await customerService.createCustomer(req.body);
    sendSuccess(res, customer, 201);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const customer = await customerService.updateCustomer(req.params.id, req.body);
    sendSuccess(res, customer);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await customerService.deleteCustomer(req.params.id, req.user!.userId);
    sendSuccess(res, { message: 'Customer deleted' });
  } catch (err) {
    next(err);
  }
}

export async function listFollowups(req: Request, res: Response, next: NextFunction) {
  try {
    const followups = await customerService.listFollowups(req.params.id);
    sendSuccess(res, followups);
  } catch (err) {
    next(err);
  }
}

export async function addFollowup(req: Request, res: Response, next: NextFunction) {
  try {
    const { note, follow_up_date } = req.body;
    const followup = await customerService.addFollowup(
      req.params.id,
      note,
      follow_up_date,
      req.user!.userId
    );
    sendSuccess(res, followup, 201);
  } catch (err) {
    next(err);
  }
}
