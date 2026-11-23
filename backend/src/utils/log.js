import { query } from '../db.js';

export async function logActivity(client, { actorId, action, targetType = null, targetId = null, detail = null }) {
  const run = client?.query ? client.query.bind(client) : query;
  await run(
    'INSERT INTO activity_log(actor_id, action, target_type, target_id, detail) VALUES ($1,$2,$3,$4,$5)',
    [actorId ?? null, action, targetType, targetId, detail],
  );
}
