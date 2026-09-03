import pg from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import type { Database } from './types.ts';

// Return DATE (oid 1082) as raw 'YYYY-MM-DD' strings — no JS Date, no timezone shift.
pg.types.setTypeParser(1082, (v) => v);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

export const pool = new pg.Pool({ connectionString });

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({ pool }),
});
