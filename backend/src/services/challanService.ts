import { query, queryOne, getClient } from '../db/pool';
import { AppError } from '../utils/response';
import { logAudit } from './auditService';

interface ChallanRow {
  id: string;
  challan_number: string;
  customer_id: string;
  total_quantity: number;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  business_name?: string;
  created_by_name?: string;
}

interface ChallanItemRow {
  id: string;
  challan_id: string;
  product_id: string;
  product_name_snapshot: string;
  sku_snapshot: string;
  unit_price_snapshot: string;
  quantity: number;
  created_at: string;
}

interface ChallanQuery {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}

async function generateChallanNumber(client: Awaited<ReturnType<typeof getClient>>): Promise<string> {
  const year = new Date().getFullYear();
  const result = await client.query(
    `INSERT INTO challan_sequences (year, last_number)
     VALUES ($1, 1)
     ON CONFLICT (year) DO UPDATE SET last_number = challan_sequences.last_number + 1
     RETURNING last_number`,
    [year]
  );
  const num = result.rows[0].last_number as number;
  return `SC-${year}-${String(num).padStart(5, '0')}`;
}

export async function listChallans(params: ChallanQuery) {
  const { page, limit, search, status } = params;
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (search) {
    conditions.push(
      `(c.challan_number ILIKE $${idx} OR cu.customer_name ILIKE $${idx} OR cu.business_name ILIKE $${idx})`
    );
    values.push(`%${search}%`);
    idx++;
  }
  if (status) {
    conditions.push(`c.status = $${idx++}`);
    values.push(status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM challans c
     JOIN customers cu ON cu.id = c.customer_id ${where}`,
    values
  );

  values.push(limit, offset);
  const challans = await query<ChallanRow>(
    `SELECT c.*, cu.customer_name, cu.business_name, u.name as created_by_name
     FROM challans c
     JOIN customers cu ON cu.id = c.customer_id
     JOIN users u ON u.id = c.created_by
     ${where}
     ORDER BY c.created_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    values
  );

  return {
    challans,
    pagination: {
      page,
      limit,
      total: parseInt(countResult?.count ?? '0', 10),
      totalPages: Math.ceil(parseInt(countResult?.count ?? '0', 10) / limit),
    },
  };
}

export async function getChallan(id: string) {
  const challan = await queryOne<ChallanRow>(
    `SELECT c.*, cu.customer_name, cu.business_name, u.name as created_by_name
     FROM challans c
     JOIN customers cu ON cu.id = c.customer_id
     JOIN users u ON u.id = c.created_by
     WHERE c.id = $1`,
    [id]
  );
  if (!challan) throw new AppError('Challan not found', 404);

  const items = await query<ChallanItemRow>(
    'SELECT * FROM challan_items WHERE challan_id = $1 ORDER BY created_at',
    [id]
  );

  const totalAmount = items.reduce(
    (sum, item) => sum + parseFloat(item.unit_price_snapshot) * item.quantity,
    0
  );

  return {
    ...challan,
    items: items.map((item) => ({
      ...item,
      unit_price_snapshot: parseFloat(item.unit_price_snapshot),
      line_total: parseFloat(item.unit_price_snapshot) * item.quantity,
    })),
    total_amount: totalAmount,
  };
}

export async function createChallan(
  customerId: string,
  items: { product_id: string; quantity: number }[],
  userId: string
) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const customerResult = await client.query('SELECT id FROM customers WHERE id = $1', [customerId]);
    if (customerResult.rows.length === 0) {
      throw new AppError('Customer not found', 404);
    }

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const challanNumber = await generateChallanNumber(client);

    const challanResult = await client.query(
      `INSERT INTO challans (challan_number, customer_id, total_quantity, status, created_by)
       VALUES ($1, $2, $3, 'DRAFT', $4) RETURNING *`,
      [challanNumber, customerId, totalQuantity, userId]
    );
    const challan = challanResult.rows[0];

    const challanItems: ChallanItemRow[] = [];
    for (const item of items) {
      const productResult = await client.query('SELECT * FROM products WHERE id = $1', [
        item.product_id,
      ]);
      if (productResult.rows.length === 0) {
        throw new AppError(`Product not found: ${item.product_id}`, 404);
      }
      const product = productResult.rows[0];

      const itemResult = await client.query(
        `INSERT INTO challan_items (challan_id, product_id, product_name_snapshot, sku_snapshot, unit_price_snapshot, quantity)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          challan.id,
          product.id,
          product.product_name,
          product.sku,
          product.unit_price,
          item.quantity,
        ]
      );
      challanItems.push(itemResult.rows[0]);
    }

    await client.query('COMMIT');
    return { ...challan, items: challanItems };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function confirmChallan(id: string, userId: string) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const challanResult = await client.query(
      'SELECT * FROM challans WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (challanResult.rows.length === 0) {
      throw new AppError('Challan not found', 404);
    }
    const challan = challanResult.rows[0];

    if (challan.status === 'CONFIRMED') {
      throw new AppError('Challan is already confirmed', 400);
    }
    if (challan.status === 'CANCELLED') {
      throw new AppError('Cannot confirm a cancelled challan', 400);
    }

    const itemsResult = await client.query(
      'SELECT * FROM challan_items WHERE challan_id = $1',
      [id]
    );
    const items = itemsResult.rows;

    if (items.length === 0) {
      throw new AppError('Challan has no items', 400);
    }

    for (const item of items) {
      const productResult = await client.query(
        'SELECT * FROM products WHERE id = $1 FOR UPDATE',
        [item.product_id]
      );
      if (productResult.rows.length === 0) {
        throw new AppError(`Product not found: ${item.product_name_snapshot}`, 404);
      }
      const product = productResult.rows[0];

      if (product.current_stock < item.quantity) {
        throw new AppError(
          `Insufficient stock for ${item.product_name_snapshot}`,
          400,
          undefined,
          { available: product.current_stock, requested: item.quantity }
        );
      }
    }

    for (const item of items) {
      const productResult = await client.query(
        'SELECT current_stock FROM products WHERE id = $1',
        [item.product_id]
      );
      const currentStock = productResult.rows[0].current_stock as number;
      const newStock = currentStock - item.quantity;

      await client.query('UPDATE products SET current_stock = $1 WHERE id = $2', [
        newStock,
        item.product_id,
      ]);

      await client.query(
        `INSERT INTO stock_movements (product_id, quantity, movement_type, reason, created_by)
         VALUES ($1, $2, 'OUT', $3, $4)`,
        [
          item.product_id,
          item.quantity,
          `Challan ${challan.challan_number} confirmed`,
          userId,
        ]
      );
    }

    await client.query(
      `UPDATE challans SET status = 'CONFIRMED' WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');
    await logAudit({
      userId,
      action: 'challan.confirmed',
      entity: 'challan',
      entityId: id,
      details: { challan_number: challan.challan_number, items: items.length },
    });
    return getChallan(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function cancelChallan(id: string, userId: string) {
  const challan = await queryOne<ChallanRow>('SELECT * FROM challans WHERE id = $1', [id]);
  if (!challan) throw new AppError('Challan not found', 404);

  if (challan.status === 'CONFIRMED') {
    throw new AppError('Cannot cancel a confirmed challan', 400);
  }
  if (challan.status === 'CANCELLED') {
    throw new AppError('Challan is already cancelled', 400);
  }

  await query(`UPDATE challans SET status = 'CANCELLED' WHERE id = $1`, [id]);
  await logAudit({
    userId,
    action: 'challan.cancelled',
    entity: 'challan',
    entityId: id,
    details: { challan_number: challan.challan_number },
  });
  return getChallan(id);
}
