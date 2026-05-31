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

export function getPostgresPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it in Vercel Project Settings > Environment Variables.");
  }

  const globalWithPool = globalThis as typeof globalThis & { __deptcontrolPgPool?: Pool };

  globalWithPool.__deptcontrolPgPool ??= new Pool({
    connectionString,
    ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : false,
  });

  return globalWithPool.__deptcontrolPgPool;
}
