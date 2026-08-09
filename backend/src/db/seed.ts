import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { pool } from './pool';
import { runMigrations } from './migrate';
import { env } from '../config/env';

const DEV_PASSWORD = 'Password123!';

async function seed() {
  if (env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    console.error('Refusing to seed in production. Set ALLOW_PRODUCTION_SEED=true to override.');
    process.exit(1);
  }

  await runMigrations();

  const client = await pool.connect();
  try {
    const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

    const users = [
      { name: 'Admin User', email: 'admin@example.com', role: 'ADMIN' },
      { name: 'Sales User', email: 'sales@example.com', role: 'SALES' },
      { name: 'Warehouse User', email: 'warehouse@example.com', role: 'WAREHOUSE' },
      { name: 'Accounts User', email: 'accounts@example.com', role: 'ACCOUNTS' },
    ];

    for (const user of users) {
      await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           name = EXCLUDED.name,
           role = EXCLUDED.role`,
        [user.name, user.email, passwordHash, user.role]
      );
    }
    console.log(`Seeded ${users.length} users.`);

    const { rows: customerRows } = await client.query<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM customers'
    );
    const { rows: productRows } = await client.query<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM products'
    );
    const customerCount = customerRows[0]?.count ?? 0;
    const productCount = productRows[0]?.count ?? 0;

    const seedPath = path.join(__dirname, '../../../database/seed.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf-8');
    const withoutComments = seedSql
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');
    const statements = withoutComments
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    let insertedDemo = false;
    for (const stmt of statements) {
      const upper = stmt.toUpperCase();
      if (!upper.includes('INSERT INTO')) continue;
      if (upper.includes('INTO CUSTOMERS') && customerCount > 0) continue;
      if (upper.includes('INTO PRODUCTS') && productCount > 0) continue;
      await client.query(stmt);
      insertedDemo = true;
    }

    if (insertedDemo) {
      console.log('Seeded demo customers and products.');
    } else {
      console.log('Demo business data skipped (tables already populated).');
    }

    console.log('Database seeded successfully.');
    console.log(`Default password for all users: ${DEV_PASSWORD}`);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
