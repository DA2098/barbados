import 'dotenv/config.js';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/barbados'
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export default pool;
