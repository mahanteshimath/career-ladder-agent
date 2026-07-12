/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Safe, single-purpose migration: creates ONLY the CL_TRACKER table.
 * Idempotent (CREATE TABLE IF NOT EXISTS) — runs no DROP/TASK statements.
 *
 * Usage (from repo root, with Snowflake env vars available):
 *   node --env-file=.env.local scripts/add-tracker-table.js
 *   # or if your vars are in .env:
 *   node --env-file=.env scripts/add-tracker-table.js
 */
const snowflake = require("snowflake-sdk");
snowflake.configure({ logLevel: "ERROR" });

const requiredEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
};

const conn = snowflake.createConnection({
  account: requiredEnv("SNOWFLAKE_ACCOUNT"),
  username: requiredEnv("SNOWFLAKE_USER"),
  password: requiredEnv("SNOWFLAKE_PASSWORD"),
  role: process.env.SNOWFLAKE_ROLE,
  warehouse: requiredEnv("SNOWFLAKE_WAREHOUSE"),
  database: requiredEnv("SNOWFLAKE_DATABASE"),
  schema: requiredEnv("SNOWFLAKE_SCHEMA"),
});

const CREATE_TRACKER = `CREATE TABLE IF NOT EXISTS CL_TRACKER (
  ID VARCHAR(36) DEFAULT UUID_STRING() NOT NULL,
  USER_ID VARCHAR(36) NOT NULL,
  JOURNEY VARCHAR(20) NOT NULL,
  STAGE VARCHAR(30) NOT NULL DEFAULT 'saved',
  TITLE VARCHAR(512) NOT NULL,
  ORGANIZATION VARCHAR(512),
  LOCATION VARCHAR(256),
  URL VARCHAR(2048),
  DEADLINE DATE,
  SOURCE_TYPE VARCHAR(20),
  SOURCE_ID VARCHAR(36),
  DEDUP_HASH VARCHAR(64),
  NOTES TEXT,
  METADATA VARIANT,
  CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  UPDATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (ID),
  UNIQUE (DEDUP_HASH),
  FOREIGN KEY (USER_ID) REFERENCES CL_USERS(ID)
)`;

conn.connect((err) => {
  if (err) {
    console.error("Connect failed:", err.message);
    process.exit(1);
  }
  console.log("Connected to Snowflake. Creating CL_TRACKER (if not exists)...");
  conn.execute({
    sqlText: CREATE_TRACKER,
    complete: (execErr) => {
      if (execErr) {
        console.error("Failed to create CL_TRACKER:", execErr.message);
        conn.destroy(() => process.exit(1));
        return;
      }
      console.log("✅ CL_TRACKER is ready.");
      conn.destroy(() => process.exit(0));
    },
  });
});
