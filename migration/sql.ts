/**
 * SQL Server connection and query helpers.
 * All queries return plain JS objects; dates are returned as JS Date objects
 * which we convert to ms timestamps.
 */
import sql from "mssql";

let pool: sql.ConnectionPool | null = null;

export async function connect() {
  pool = await sql.connect({
    server: process.env.SQL_SERVER ?? "52.74.111.85",
    database: process.env.SQL_DATABASE ?? "Oolala",
    user: process.env.SQL_USER ?? "sa",
    password: process.env.SQL_PASSWORD ?? "",
    options: {
      trustServerCertificate: true,
      enableArithAbort: true,
    },
    pool: { max: 5, min: 1, idleTimeoutMillis: 30000 },
  });
  console.log("✓ Connected to SQL Server");
}

export async function disconnect() {
  if (pool) await pool.close();
}

export async function query<T = Record<string, unknown>>(
  sql_: string
): Promise<T[]> {
  if (!pool) throw new Error("Not connected");
  const result = await pool.request().query(sql_);
  return result.recordset as T[];
}

/** Convert a SQL DateTimeOffset / Date to a Unix ms timestamp, or null. */
export function toMs(val: Date | string | null | undefined): number | undefined {
  if (val == null) return undefined;
  const ms = new Date(val).getTime();
  return isNaN(ms) ? undefined : ms;
}

/** Count rows in a table (for verification). */
export async function count(table: string): Promise<number> {
  const rows = await query<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`);
  return rows[0].n;
}
