import app from './app';
import { env } from './config/env';
import { pool } from './db/pool';

const PORT = parseInt(env.PORT, 10);

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('Database connected');
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API docs: http://localhost:${PORT}/api/docs`);
  });
}

start();
