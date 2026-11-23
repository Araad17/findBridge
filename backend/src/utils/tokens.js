import { query } from '../db.js';
import { randomToken, sha256 } from './crypto.js';

export async function createToken(client, userId, type, payload = null, ttlMinutes = 60) {
  const run = client?.query ? client.query.bind(client) : query;
  const raw = randomToken(32);
  // توکن‌های قبلی همان نوع باطل می‌شوند
  await run('UPDATE auth_tokens SET used_at = now() WHERE user_id = $1 AND type = $2 AND used_at IS NULL', [userId, type]);
  await run(
    `INSERT INTO auth_tokens(user_id, type, token_hash, payload, expires_at)
     VALUES ($1,$2,$3,$4, now() + ($5 || ' minutes')::interval)`,
    [userId, type, sha256(raw), payload, String(ttlMinutes)],
  );
  return raw;
}

/** توکن را به‌صورت اتمیک مصرف می‌کند؛ در صورت نامعتبر بودن null برمی‌گرداند. */
export async function consumeToken(client, raw, type) {
  const run = client?.query ? client.query.bind(client) : query;
  const { rows } = await run(
    `UPDATE auth_tokens SET used_at = now()
      WHERE token_hash = $1 AND type = $2 AND used_at IS NULL AND expires_at > now()
      RETURNING user_id, payload`,
    [sha256(raw), type],
  );
  return rows[0] || null;
}
