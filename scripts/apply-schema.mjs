import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import postgres from "postgres";

const root = process.cwd();
const envPath = path.join(root, ".env.local");
const schemaPath = path.join(root, "drizzle", "0000_initial.sql");

dotenv.config({ path: envPath });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não configurado em .env.local.");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, {
  prepare: false,
  max: 1,
});

const schema = fs.readFileSync(schemaPath, "utf8");
const statements = schema
  .split(/;\s*(?:\r?\n|$)/)
  .map((statement) => statement.trim())
  .filter(Boolean);

try {
  for (const statement of statements) {
    await sql.unsafe(statement);
  }

  const tables = await sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
    order by table_name
  `;

  console.log(`Schema aplicado com sucesso. Tabelas públicas: ${tables.length}.`);
} catch (error) {
  console.error("Falha ao aplicar o schema:", error);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 }).catch(() => {});
}
