import pg from 'pg';
import { config } from './config.js';

// DATE را به‌صورت رشته YYYY-MM-DD نگه می‌داریم تا مشکل منطقه زمانی پیش نیاید
pg.types.setTypeParser(1082, (v) => v);
// BIGINT/COUNT به عدد (برای شناسه‌ها و شمارنده‌های کوچک ایمن است)
pg.types.setTypeParser(20, (v) => Number(v));

export const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 10 });

export const query = (text, params) => pool.query(text, params);

export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
