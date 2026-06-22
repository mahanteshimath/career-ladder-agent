/**
 * Bootstrap Snowflake schema — run once to create all tables, stages, and tasks.
 * Usage: npx tsx --env-file=.env scripts/bootstrap-snowflake.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";

async function bootstrap() {
  // Dynamic import to avoid module resolution issues at build time
  const { executeQuery, destroyConnection } = await import("../src/lib/snowflake/client");

  console.log("🚀 Starting Snowflake schema bootstrap...\n");

  const schemaPath = resolve(__dirname, "../src/lib/snowflake/schema.sql");
  const schemaSql = readFileSync(schemaPath, "utf-8");

  // Split by semicolons, strip comment-only lines, filter out empty statements
  const statements = schemaSql
    .split(";")
    .map((s) =>
      s
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter((s) => s.length > 0);

  let success = 0;
  let failed = 0;

  for (const statement of statements) {
    try {
      await executeQuery(statement);
      const firstLine = statement.split("\n")[0].trim();
      console.log(`  ✓ ${firstLine.slice(0, 60)}...`);
      success++;
    } catch (error) {
      const firstLine = statement.split("\n")[0].trim();
      console.error(`  ✗ ${firstLine.slice(0, 60)}...`);
      console.error(`    Error: ${(error as Error).message}\n`);
      failed++;
    }
  }

  console.log(`\n✅ Bootstrap complete: ${success} succeeded, ${failed} failed`);

  await destroyConnection();
  process.exit(failed > 0 ? 1 : 0);
}

bootstrap().catch((err) => {
  console.error("Fatal bootstrap error:", err);
  process.exit(1);
});
