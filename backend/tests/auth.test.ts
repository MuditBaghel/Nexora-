import request from 'supertest';
import { app, adminToken, salesToken, warehouseToken, DEV_PASSWORD } from './helpers';

describe('Authentication', () => {
  it('should login successfully with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: DEV_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('admin@example.com');
    expect(res.body.data.user.password_hash).toBeUndefined();
  });

  it('should reject invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject missing authentication', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return current user with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('ADMIN');
  });
});

describe('Authorization', () => {
  it('should allow permitted role to access customers', async () => {
    const res = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${salesToken}`);
    expect(res.status).toBe(200);
  });

  it('should forbid warehouse role from creating customers', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        customer_name: 'Test',
        mobile: '9876543210',
        email: 'test@test.com',
        business_name: 'Test Biz',
        customer_type: 'RETAIL',
        address: 'Test Address',
      });
    expect(res.status).toBe(403);
  });
});
