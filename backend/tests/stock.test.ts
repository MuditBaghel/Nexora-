import request from 'supertest';
import { pool } from '../src/db/pool';
import { app, warehouseToken } from './helpers';

describe('Stock', () => {
  let productId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        product_name: 'Stock Test Product',
        sku: `STK-${Date.now()}`,
        category: 'Test',
        unit_price: 50,
        current_stock: 20,
        minimum_stock: 5,
        warehouse_location: 'B-01',
      });
    productId = res.body.data.id;
  });

  it('should record stock IN', async () => {
    const res = await request(app)
      .post('/api/stock/movements')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        product_id: productId,
        quantity: 10,
        movement_type: 'IN',
        reason: 'Restock',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.movement_type).toBe('IN');

    const product = await pool.query('SELECT current_stock FROM products WHERE id = $1', [productId]);
    expect(product.rows[0].current_stock).toBe(30);
  });

  it('should record stock OUT', async () => {
    const res = await request(app)
      .post('/api/stock/movements')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        product_id: productId,
        quantity: 5,
        movement_type: 'OUT',
        reason: 'Damaged goods',
      });

    expect(res.status).toBe(201);
    const product = await pool.query('SELECT current_stock FROM products WHERE id = $1', [productId]);
    expect(product.rows[0].current_stock).toBe(25);
  });

  it('should prevent negative stock', async () => {
    const res = await request(app)
      .post('/api/stock/movements')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        product_id: productId,
        quantity: 100,
        movement_type: 'OUT',
        reason: 'Over withdrawal',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.available).toBe(25);
    expect(res.body.requested).toBe(100);

    const product = await pool.query('SELECT current_stock FROM products WHERE id = $1', [productId]);
    expect(product.rows[0].current_stock).toBe(25);
  });
});
