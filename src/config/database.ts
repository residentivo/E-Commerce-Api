import 'dotenv/config';
import pg from 'pg';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const { Pool } = pg;

export const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

pool.on('error', (error: Error) => {
    console.error('Erro inesperado no pool de conexões:', error);
});

/** Executa uma query com parâmetros genéricos. */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: readonly unknown[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params as unknown[]);
  const dur = Date.now() - start;
  if (dur > 200) console.warn(`[SLOW ${dur}ms] ${text}`);
  return res;
}