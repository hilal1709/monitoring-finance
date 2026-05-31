import "server-only";

import { Pool } from "pg";

function shouldUseSsl(connectionString: string) {
  try {
    const url = new URL(connectionString);
    const host = url.hostname.toLowerCase();
    const sslMode = url.searchParams.get("sslmode")?.toLowerCase();

    if (sslMode === "disable") {
      return false;
    }

    return host !== "localhost" && host !== "127.0.0.1" && host !== "::1";
  } catch {
    return !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1");
  }
}

function normalizeConnectionString(connectionString: string) {
  try {
    const url = new URL(connectionString);

    // node-postgres can let sslmode from the URL override the explicit ssl
    // object below. Keep SSL controlled in one place so Supabase pooler works
    // consistently on Vercel.
    url.searchParams.delete("sslmode");
    url.searchParams.delete("sslcert");
    url.searchParams.delete("sslkey");
    url.searchParams.delete("sslrootcert");

    return url.toString();
  } catch {
    return connectionString;
  }
}

export function getPostgresPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it in Vercel Project Settings > Environment Variables.");
  }

  const globalWithPool = globalThis as typeof globalThis & { __deptcontrolPgPool?: Pool };
  const useSsl = shouldUseSsl(connectionString);

  globalWithPool.__deptcontrolPgPool ??= new Pool({
    connectionString: normalizeConnectionString(connectionString),
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });

  return globalWithPool.__deptcontrolPgPool;
}
