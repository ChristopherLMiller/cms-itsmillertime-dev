/**
 * Payload plants a payload_migrations row with batch = -1 when the schema is
 * updated via dev "push". That marker makes `payload migrate` prompt
 * interactively and hang headless deploys (Coolify). Clearing it is the
 * officially documented fix and does not remove real migration history.
 */
import pg from 'pg';

const connectionString = process.env.DATABASE_URI;
if (!connectionString) {
  console.error('[start:prod] DATABASE_URI is required');
  process.exit(1);
}

const client = new pg.Client({ connectionString });

try {
  await client.connect();
  const result = await client.query(
    'DELETE FROM payload_migrations WHERE batch = -1 RETURNING id, name, batch',
  );
  if (result.rowCount > 0) {
    console.log(
      `[start:prod] Cleared ${result.rowCount} dev-mode push marker(s) from payload_migrations`,
    );
  }
} catch (err) {
  // First boot may not have the table yet; migrate will create what it needs.
  if (err && typeof err === 'object' && 'code' in err && err.code === '42P01') {
    console.log('[start:prod] payload_migrations table not found yet; continuing');
  } else {
    console.error('[start:prod] Failed to clear dev-mode migration markers:', err);
    process.exit(1);
  }
} finally {
  await client.end().catch(() => undefined);
}
