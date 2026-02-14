import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Raw SQL client (for RLS context, raw queries, password verification)
export const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
});

// Drizzle ORM instance with full schema
export const db = drizzle(sql, { schema });

// Type for the SQL tagged template function
type Sql = typeof sql;

/**
 * Execute a function within a tenant-scoped transaction.
 * Sets the RLS context variable so Row Level Security policies filter correctly.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: Sql) => Promise<T>
): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (await sql.begin(async (tx: any) => {
    await tx`SET LOCAL app.current_tenant_id = ${tenantId}`;
    return fn(tx);
  })) as T;
}

/**
 * Execute a function within a transaction (no tenant context).
 */
export async function withTransaction<T>(
  fn: (tx: Sql) => Promise<T>
): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (await sql.begin(fn as any)) as T;
}
