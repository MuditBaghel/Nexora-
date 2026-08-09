import { query, queryOne } from '../db/pool';
import { AppError } from '../utils/response';

interface ProductRow {
  id: string;
  product_name: string;
  sku: string;
  category: string;
  unit_price: string;
  current_stock: number;
  minimum_stock: number;
  warehouse_location: string;
  created_at: string;
  updated_at: string;
}

interface ProductQuery {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  low_stock?: string;
}

export async function listProducts(params: ProductQuery) {
  const { page, limit, search, category, low_stock } = params;
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (search) {
    conditions.push(`(product_name ILIKE $${idx} OR sku ILIKE $${idx})`);
    values.push(`%${search}%`);
    idx++;
  }
  if (category) {
    conditions.push(`category = $${idx++}`);
    values.push(category);
  }
  if (low_stock === 'true') {
    conditions.push('current_stock <= minimum_stock');
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM products ${where}`,
    values
  );

  values.push(limit, offset);
  const products = await query<ProductRow>(
    `SELECT * FROM products ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    values
  );

  return {
    products: products.map((p) => ({
      ...p,
      unit_price: parseFloat(p.unit_price),
      is_low_stock: p.current_stock <= p.minimum_stock,
    })),
    pagination: {
      page,
      limit,
      total: parseInt(countResult?.count ?? '0', 10),
      totalPages: Math.ceil(parseInt(countResult?.count ?? '0', 10) / limit),
    },
  };
}

export async function getProduct(id: string) {
  const product = await queryOne<ProductRow>('SELECT * FROM products WHERE id = $1', [id]);
  if (!product) throw new AppError('Product not found', 404);
  return {
    ...product,
    unit_price: parseFloat(product.unit_price),
    is_low_stock: product.current_stock <= product.minimum_stock,
  };
}

export async function createProduct(data: Record<string, unknown>) {
  try {
    const product = await queryOne<ProductRow>(
      `INSERT INTO products (product_name, sku, category, unit_price, current_stock, minimum_stock, warehouse_location)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        data.product_name,
        data.sku,
        data.category,
        data.unit_price,
        data.current_stock ?? 0,
        data.minimum_stock ?? 0,
        data.warehouse_location,
      ]
    );
    return {
      ...product!,
      unit_price: parseFloat(product!.unit_price),
      is_low_stock: product!.current_stock <= product!.minimum_stock,
    };
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      throw new AppError('SKU already exists', 409);
    }
    throw err;
  }
}

export async function updateProduct(id: string, data: Record<string, unknown>) {
  await getProduct(id);
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const allowed = [
    'product_name', 'sku', 'category', 'unit_price',
    'current_stock', 'minimum_stock', 'warehouse_location',
  ];

  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${idx++}`);
      values.push(data[key]);
    }
  }

  if (fields.length === 0) throw new AppError('No fields to update', 400);

  try {
    values.push(id);
    const product = await queryOne<ProductRow>(
      `UPDATE products SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return {
      ...product!,
      unit_price: parseFloat(product!.unit_price),
      is_low_stock: product!.current_stock <= product!.minimum_stock,
    };
  } catch (err: unknown) {
    if ((err as { code?: string }).code === '23505') {
      throw new AppError('SKU already exists', 409);
    }
    throw err;
  }
}
