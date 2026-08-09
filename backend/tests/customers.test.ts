import request from 'supertest';
import { app, salesToken } from './helpers';

describe('Customers', () => {
  let customerId: string;

  it('should create a customer', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customer_name: 'Test Customer',
        mobile: '9123456789',
        email: 'testcustomer@example.com',
        business_name: 'Test Business',
        customer_type: 'RETAIL',
        address: '123 Test Street',
        status: 'LEAD',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.customer_name).toBe('Test Customer');
    customerId = res.body.data.id;
  });

  it('should fail validation for invalid mobile', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customer_name: 'Bad Mobile',
        mobile: '123',
        email: 'bad@example.com',
        business_name: 'Biz',
        customer_type: 'RETAIL',
        address: 'Address',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should search customers', async () => {
    const res = await request(app)
      .get('/api/customers?search=Test Customer')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.customers.length).toBeGreaterThan(0);
  });

  it('should add follow-up', async () => {
    const res = await request(app)
      .post(`/api/customers/${customerId}/followups`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ note: 'Called customer', follow_up_date: '2026-09-01' });

    expect(res.status).toBe(201);
    expect(res.body.data.note).toBe('Called customer');
  });
});
