import 'dotenv/config.js';
import pg from 'pg';

const { Pool } = pg;

function createPool() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/barbados';

  // Enable SSL in production or when explicitly requested. Many managed Postgres
  // providers (Render, Heroku) require SSL and may use self-signed certs.
  const shouldUseSsl = process.env.DATABASE_SSL === 'true' || process.env.NODE_ENV === 'production' || /render\.com|herokuapp\.com|aws/.test(connectionString);

  const config = { connectionString };
  if (shouldUseSsl) {
    // Use a permissive SSL config to accept provider certs. If you require
    // strict verification, set DATABASE_SSL to 'strict' and adjust below.
    config.ssl = { rejectUnauthorized: false };
  }

  const pool = new Pool(config);

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  return pool;
}

const pool = createPool();

export default pool;
