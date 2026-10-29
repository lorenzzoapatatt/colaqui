import { Pool } from "pg";

let pool: Pool | undefined;

export function getPgPool(connectionString: string): Pool {
  pool ??= new Pool({ connectionString, max: 10 });
  return pool;
}

export async function closePgPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
