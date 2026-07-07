/**
 * Thin wrapper around the Convex HTTP API for migration writes.
 *
 * We use the Convex HTTP API directly (not the JS client) because the
 * migration runs in a plain Node.js process, not inside a Convex function.
 * We call public `mutation` functions defined in convex/migration.ts.
 */

const CONVEX_URL = process.env.CONVEX_URL ?? "";
const DEPLOY_KEY = process.env.CONVEX_DEPLOY_KEY ?? "";

if (!CONVEX_URL) {
  throw new Error("CONVEX_URL environment variable is required");
}

type ConvexArgs = Record<string, unknown>;

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 5): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      // Retry on 429 (rate limit) or 5xx server errors
      if (res.status === 429 || res.status >= 500) {
        const delay = Math.min(1000 * 2 ** attempt, 30000);
        await new Promise((r) => setTimeout(r, delay));
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      const delay = Math.min(1000 * 2 ** attempt, 30000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

/** Call a Convex mutation by its path, e.g. "migration:insert" */
export async function callMutation(
  functionPath: string,
  args: ConvexArgs
): Promise<unknown> {
  const url = `${CONVEX_URL}/api/mutation`;
  const body = JSON.stringify({ path: functionPath, args, format: "json" });

  const res = await fetchWithRetry(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(DEPLOY_KEY ? { Authorization: `Convex ${DEPLOY_KEY}` } : {}),
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Convex mutation ${functionPath} failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  if (json.status === "error") {
    throw new Error(`Convex mutation ${functionPath} error: ${json.errorMessage}`);
  }
  return json.value;
}

/** Call a Convex query by its path */
export async function callQuery(
  functionPath: string,
  args: ConvexArgs = {}
): Promise<unknown> {
  const url = `${CONVEX_URL}/api/query`;
  const body = JSON.stringify({ path: functionPath, args, format: "json" });

  const res = await fetchWithRetry(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(DEPLOY_KEY ? { Authorization: `Convex ${DEPLOY_KEY}` } : {}),
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Convex query ${functionPath} failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  if (json.status === "error") {
    throw new Error(`Convex query ${functionPath} error: ${json.errorMessage}`);
  }
  return json.value;
}

/** Insert one record; returns the new Convex _id. */
export async function insert(
  table: string,
  doc: ConvexArgs
): Promise<string> {
  return (await callMutation("migration:insert", { table, doc })) as string;
}

/** Patch specific fields on a document by its Convex _id. */
export async function patch(
  table: string,
  id: string,
  fields: ConvexArgs
): Promise<void> {
  await callMutation("migration:patch", { table, id, fields });
}

/** Check if a record with a given sqlId already exists in a table. Returns the Convex _id or null. */
export async function findBySqlId(
  table: string,
  sqlId: number
): Promise<string | null> {
  return (await callQuery("migration:findBySqlId", { table, sqlId })) as string | null;
}
