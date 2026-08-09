import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/app';
import { pool } from '../src/db/pool';
import { runMigrations } from '../src/db/migrate';

export const DEV_PASSWORD = 'Password123!';

export let adminToken = '';
export let salesToken = '';
export let warehouseToken = '';
export let accountsToken = '';

let initialized = false;

export async function setupTestDb() {
  if (initialized) return;

  await pool.query(`
    DROP TABLE IF EXISTS schema_migrations CASCADE;
    DROP TABLE IF EXISTS audit_log CASCADE;
    DROP TABLE IF EXISTS sessions CASCADE;
    DROP TABLE IF EXISTS challan_items CASCADE;
    DROP TABLE IF EXISTS challan_sequences CASCADE;
    DROP TABLE IF EXISTS challans CASCADE;
    DROP TABLE IF EXISTS stock_movements CASCADE;
    DROP TABLE IF EXISTS products CASCADE;
    DROP TABLE IF EXISTS customer_followups CASCADE;
    DROP TABLE IF EXISTS customers CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TYPE IF EXISTS challan_status CASCADE;
    DROP TYPE IF EXISTS movement_type CASCADE;
    DROP TYPE IF EXISTS customer_status CASCADE;
    DROP TYPE IF EXISTS customer_type CASCADE;
    DROP TYPE IF EXISTS user_role CASCADE;
  `);

  await runMigrations();

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);
  const users = [
    { name: 'Admin', email: 'admin@example.com', role: 'ADMIN' },
    { name: 'Sales', email: 'sales@example.com', role: 'SALES' },
    { name: 'Warehouse', email: 'warehouse@example.com', role: 'WAREHOUSE' },
    { name: 'Accounts', email: 'accounts@example.com', role: 'ACCOUNTS' },
  ];

  for (const user of users) {
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = $3`,
      [user.name, user.email, passwordHash, user.role]
    );
  }

  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@example.com', password: DEV_PASSWORD });
  adminToken = adminRes.body.data.token;

  const salesRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'sales@example.com', password: DEV_PASSWORD });
  salesToken = salesRes.body.data.token;

  const whRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'warehouse@example.com', password: DEV_PASSWORD });
  warehouseToken = whRes.body.data.token;

  const accRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'accounts@example.com', password: DEV_PASSWORD });
  accountsToken = accRes.body.data.token;

  initialized = true;
}

export async function teardownTestDb() {
  await pool.end();
}

export { app };
