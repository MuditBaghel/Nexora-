import { query, queryOne } from '../db/pool';
import { AppError } from '../utils/response';
import { logAudit } from './auditService';

interface CustomerRow {
  id: string;
  customer_name: string;
  mobile: string;
  email: string;
  business_name: string;
  gst_number: string | null;
  customer_type: string;
  address: string;
  status: string;
  follow_up_date: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface FollowupRow {
  id: string;
  customer_id: string;
  note: string;
  follow_up_date: string;
  created_by: string;
  created_at: string;
  created_by_name?: string;
}

interface CustomerQuery {
  page: number;
  limit: number;
  search?: string;
  customer_type?: string;
  status?: string;
}

export async function listCustomers(params: CustomerQuery) {
  const { page, limit, search, customer_type, status } = params;
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (search) {
    conditions.push(
      `(customer_name ILIKE $${idx} OR business_name ILIKE $${idx} OR mobile ILIKE $${idx} OR email ILIKE $${idx})`
    );
    values.push(`%${search}%`);
    idx++;
  }
  if (customer_type) {
    conditions.push(`customer_type = $${idx++}`);
    values.push(customer_type);
  }
  if (status) {
    conditions.push(`status = $${idx++}`);
    values.push(status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM customers ${where}`,
    values
  );

  values.push(limit, offset);
  const customers = await query<CustomerRow>(
    `SELECT * FROM customers ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    values
  );

  return {
    customers,
    pagination: {
      page,
      limit,
      total: parseInt(countResult?.count ?? '0', 10),
      totalPages: Math.ceil(parseInt(countResult?.count ?? '0', 10) / limit),
    },
  };
}

export async function getCustomer(id: string) {
  const customer = await queryOne<CustomerRow>('SELECT * FROM customers WHERE id = $1', [id]);
  if (!customer) throw new AppError('Customer not found', 404);
  return customer;
}

export async function createCustomer(data: Record<string, unknown>) {
  const gst = data.gst_number === '' ? null : data.gst_number;
  const customer = await queryOne<CustomerRow>(
    `INSERT INTO customers (customer_name, mobile, email, business_name, gst_number, customer_type, address, status, follow_up_date, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      data.customer_name,
      data.mobile,
      data.email,
      data.business_name,
      gst,
      data.customer_type,
      data.address,
      data.status ?? 'LEAD',
      data.follow_up_date || null,
      data.notes ?? '',
    ]
  );
  return customer!;
}

export async function updateCustomer(id: string, data: Record<string, unknown>) {
  await getCustomer(id);
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const allowed = [
    'customer_name', 'mobile', 'email', 'business_name', 'gst_number',
    'customer_type', 'address', 'status', 'follow_up_date', 'notes',
  ];

  for (const key of allowed) {
    if (data[key] !== undefined) {
      let val = data[key];
      if (key === 'gst_number' && val === '') val = null;
      if (key === 'follow_up_date' && val === '') val = null;
      fields.push(`${key} = $${idx++}`);
      values.push(val);
    }
  }

  if (fields.length === 0) throw new AppError('No fields to update', 400);

  values.push(id);
  const customer = await queryOne<CustomerRow>(
    `UPDATE customers SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return customer!;
}

export async function deleteCustomer(id: string, userId: string) {
  const customer = await getCustomer(id);
  await query('DELETE FROM customers WHERE id = $1', [id]);
  await logAudit({
    userId,
    action: 'customer.deleted',
    entity: 'customer',
    entityId: id,
    details: { customer_name: customer.customer_name },
  });
}

export async function listFollowups(customerId: string) {
  await getCustomer(customerId);
  return query<FollowupRow>(
    `SELECT cf.*, u.name as created_by_name
     FROM customer_followups cf
     JOIN users u ON u.id = cf.created_by
     WHERE cf.customer_id = $1
     ORDER BY cf.created_at DESC`,
    [customerId]
  );
}

export async function addFollowup(
  customerId: string,
  note: string,
  followUpDate: string,
  userId: string
) {
  await getCustomer(customerId);
  const followup = await queryOne<FollowupRow>(
    `INSERT INTO customer_followups (customer_id, note, follow_up_date, created_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [customerId, note, followUpDate, userId]
  );

  await query(
    'UPDATE customers SET follow_up_date = $1 WHERE id = $2',
    [followUpDate, customerId]
  );

  return followup!;
}
