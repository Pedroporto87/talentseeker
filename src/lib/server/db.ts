import postgres from "postgres";
import { getServerEnv } from "@/lib/server/env";

declare global {
  var __resumeSqlClient: ReturnType<typeof postgres> | undefined;
}

export function getSqlClient() {
  const { databaseUrl } = getServerEnv();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL não configurado.");
  }

  if (!globalThis.__resumeSqlClient) {
    globalThis.__resumeSqlClient = postgres(databaseUrl, {
      prepare: false,
      max: 1,
      connect_timeout: 10,
      idle_timeout: 20,
      ssl: process.env.NODE_ENV === "production" ? "require" : false,
    });
  }

  return globalThis.__resumeSqlClient;
}
