import request from 'supertest';
import { pool } from '../src/db/pool';
import { app, salesToken, warehouseToken } from './helpers';

describe('Challans', () => {
  let customerId: string;
  let productAId: string;
  let productBId: string;
  let productLowStockId: string;
  let draftChallanId: string;

  beforeAll(async () => {
    const custRes = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customer_name: 'Challan Customer',
        mobile: '9988776655',
        email: 'challan@example.com',
        business_name: 'Challan Biz',
        customer_type: 'WHOLESALE',
        address: 'Challan Address',
        status: 'ACTIVE',
      });
    customerId = custRes.body.data.id;

    const ts = Date.now();
    const prodA = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        product_name: 'Challan Product A',
        sku: `CHA-A-${ts}`,
        category: 'Test',
        unit_price: 100,
        current_stock: 50,
        minimum_stock: 5,
        warehouse_location: 'C-01',
      });
    productAId = prodA.body.data.id;

    const prodB = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        product_name: 'Challan Product B',
        sku: `CHA-B-${ts}`,
        category: 'Test',
        unit_price: 200,
        current_stock: 30,
        minimum_stock: 5,
        warehouse_location: 'C-02',
      });
    productBId = prodB.body.data.id;

    const prodLow = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        product_name: 'Low Stock Product',
        sku: `CHA-LOW-${ts}`,
        category: 'Test',
        unit_price: 50,
        current_stock: 3,
        minimum_stock: 5,
        warehouse_location: 'C-03',
      });
    productLowStockId = prodLow.body.data.id;
  });

  it('should create draft challan with multiple products', async () => {
    const res = await request(app)
      .post('/api/challans')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customer_id: customerId,
        items: [
          { product_id: productAId, quantity: 5 },
          { product_id: productBId, quantity: 3 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('DRAFT');
    expect(res.body.data.challan_number).toMatch(/^SC-\d{4}-\d{5}$/);
    expect(res.body.data.items.length).toBe(2);
    draftChallanId = res.body.data.id;

    const items = await pool.query(
      'SELECT product_name_snapshot, sku_snapshot FROM challan_items WHERE challan_id = $1',
      [draftChallanId]
    );
    expect(items.rows[0].product_name_snapshot).toBe('Challan Product A');
    expect(items.rows[0].sku_snapshot).toBeTruthy();
  });

  it('should confirm challan successfully and deduct stock', async () => {
    const stockBefore = await pool.query(
      'SELECT current_stock FROM products WHERE id = $1',
      [productAId]
    );

    const res = await request(app)
      .post(`/api/challans/${draftChallanId}/confirm`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CONFIRMED');

    const stockAfter = await pool.query(
      'SELECT current_stock FROM products WHERE id = $1',
      [productAId]
    );
    expect(stockAfter.rows[0].current_stock).toBe(stockBefore.rows[0].current_stock - 5);

    const movements = await pool.query(
      `SELECT * FROM stock_movements WHERE product_id = $1 AND movement_type = 'OUT'`,
      [productAId]
    );
    expect(movements.rows.length).toBeGreaterThan(0);
  });

  it('should reject duplicate confirmation', async () => {
    const res = await request(app)
      .post(`/api/challans/${draftChallanId}/confirm`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('already confirmed');
  });

  it('should reject insufficient stock and rollback (mandatory)', async () => {
    const createRes = await request(app)
      .post('/api/challans')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customer_id: customerId,
        items: [
          { product_id: productAId, quantity: 2 },
          { product_id: productBId, quantity: 1 },
          { product_id: productLowStockId, quantity: 10 },
        ],
      });

    const challanId = createRes.body.data.id;

    const stockBeforeA = (await pool.query('SELECT current_stock FROM products WHERE id = $1', [productAId])).rows[0].current_stock;
    const stockBeforeB = (await pool.query('SELECT current_stock FROM products WHERE id = $1', [productBId])).rows[0].current_stock;
    const stockBeforeLow = (await pool.query('SELECT current_stock FROM products WHERE id = $1', [productLowStockId])).rows[0].current_stock;

    const res = await request(app)
      .post(`/api/challans/${challanId}/confirm`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Insufficient stock');
    expect(res.body.available).toBe(3);
    expect(res.body.requested).toBe(10);

    const stockAfterA = (await pool.query('SELECT current_stock FROM products WHERE id = $1', [productAId])).rows[0].current_stock;
    const stockAfterB = (await pool.query('SELECT current_stock FROM products WHERE id = $1', [productBId])).rows[0].current_stock;
    const stockAfterLow = (await pool.query('SELECT current_stock FROM products WHERE id = $1', [productLowStockId])).rows[0].current_stock;

    expect(stockAfterA).toBe(stockBeforeA);
    expect(stockAfterB).toBe(stockBeforeB);
    expect(stockAfterLow).toBe(stockBeforeLow);

    const challanStatus = await pool.query('SELECT status FROM challans WHERE id = $1', [challanId]);
    expect(challanStatus.rows[0].status).toBe('DRAFT');
  });

  it('should cancel draft challan', async () => {
    const createRes = await request(app)
      .post('/api/challans')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customer_id: customerId,
        items: [{ product_id: productAId, quantity: 1 }],
      });

    const res = await request(app)
      .post(`/api/challans/${createRes.body.data.id}/cancel`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CANCELLED');
  });

  it('should not cancel confirmed challan', async () => {
    const res = await request(app)
      .post(`/api/challans/${draftChallanId}/cancel`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Cannot cancel a confirmed');
  });
});
