import request from 'supertest';
import { app, warehouseToken } from './helpers';

describe('Products', () => {
  let productId: string;
  const sku = `TEST-SKU-${Date.now()}`;

  it('should create a product', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        product_name: 'Test Product',
        sku,
        category: 'Test',
        unit_price: 100,
        current_stock: 50,
        minimum_stock: 10,
        warehouse_location: 'A-01',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.sku).toBe(sku);
    productId = res.body.data.id;
  });

  it('should fail validation for negative price', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        product_name: 'Bad Product',
        sku: `BAD-${Date.now()}`,
        category: 'Test',
        unit_price: -10,
        warehouse_location: 'A-01',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject duplicate SKU', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        product_name: 'Duplicate',
        sku,
        category: 'Test',
        unit_price: 100,
        warehouse_location: 'A-01',
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('SKU');
  });

  it('should list products with search', async () => {
    const res = await request(app)
      .get(`/api/products?search=${sku}`)
      .set('Authorization', `Bearer ${warehouseToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.products.length).toBeGreaterThan(0);
  });
});
