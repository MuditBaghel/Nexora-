import { query, queryOne, getClient } from '../db/pool';
import { AppError } from '../utils/response';
import { logAudit } from './auditService';

interface StockMovementRow {
  id: string;
  product_id: string;
  quantity: number;
  movement_type: string;
  reason: string;
  created_by: string;
  created_at: string;
  product_name?: string;
  sku?: string;
  created_by_name?: string;
}

interface StockQuery {
  page: number;
  limit: number;
  search?: string;
  product_id?: string;
  movement_type?: string;
  date_from?: string;
  date_to?: string;
}

export async function listStockMovements(params: StockQuery) {
  const { page, limit, search, product_id, movement_type, date_from, date_to } = params;
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (product_id) {
    conditions.push(`sm.product_id = $${idx++}`);
    values.push(product_id);
  }
  if (movement_type) {
    conditions.push(`sm.movement_type = $${idx++}`);
    values.push(movement_type);
  }
  if (date_from) {
    conditions.push(`sm.created_at >= $${idx++}`);
    values.push(date_from);
  }
  if (date_to) {
    conditions.push(`sm.created_at <= $${idx++}::date + interval '1 day'`);
    values.push(date_to);
  }
  if (search) {
    conditions.push(`(p.product_name ILIKE $${idx} OR p.sku ILIKE $${idx})`);
    values.push(`%${search}%`);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM stock_movements sm
     JOIN products p ON p.id = sm.product_id ${where}`,
    values
  );

  values.push(limit, offset);
  const movements = await query<StockMovementRow>(
    `SELECT sm.*, p.product_name, p.sku, u.name as created_by_name
     FROM stock_movements sm
     JOIN products p ON p.id = sm.product_id
     JOIN users u ON u.id = sm.created_by
     ${where}
     ORDER BY sm.created_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    values
  );

  return {
    movements,
    pagination: {
      page,
      limit,
      total: parseInt(countResult?.count ?? '0', 10),
      totalPages: Math.ceil(parseInt(countResult?.count ?? '0', 10) / limit),
    },
  };
}

export async function createStockMovement(
  productId: string,
  quantity: number,
  movementType: 'IN' | 'OUT',
  reason: string,
  userId: string
) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const productResult = await client.query(
      'SELECT * FROM products WHERE id = $1 FOR UPDATE',
      [productId]
    );

    if (productResult.rows.length === 0) {
      throw new AppError('Product not found', 404);
    }

    const product = productResult.rows[0];
    const currentStock = product.current_stock as number;

    if (movementType === 'OUT' && currentStock < quantity) {
      throw new AppError(
        `Insufficient stock for ${product.product_name}`,
        400,
        undefined,
        { available: currentStock, requested: quantity }
      );
    }

    const newStock =
      movementType === 'IN' ? currentStock + quantity : currentStock - quantity;

    if (newStock < 0) {
      throw new AppError(
        `Insufficient stock for ${product.product_name}`,
        400,
        undefined,
        { available: currentStock, requested: quantity }
      );
    }

    await client.query('UPDATE products SET current_stock = $1 WHERE id = $2', [
      newStock,
      productId,
    ]);

    const movementResult = await client.query(
      `INSERT INTO stock_movements (product_id, quantity, movement_type, reason, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [productId, quantity, movementType, reason, userId]
    );

    await client.query('COMMIT');
    await logAudit({
      userId,
      action: 'stock.movement',
      entity: 'product',
      entityId: productId,
      details: { movement_type: movementType, quantity, reason },
    });
    return movementResult.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
