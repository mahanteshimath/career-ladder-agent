import snowflake from "snowflake-sdk";

// Disable OOB telemetry for serverless environments
snowflake.configure({ logLevel: "ERROR" });

export interface SnowflakeConfig {
  account: string;
  username: string;
  password: string;
  role: string;
  warehouse: string;
  database: string;
  schema: string;
}

function getConfig(): SnowflakeConfig {
  return {
    account: process.env.SNOWFLAKE_ACCOUNT!,
    username: process.env.SNOWFLAKE_USER!,
    password: process.env.SNOWFLAKE_PASSWORD!,
    role: process.env.SNOWFLAKE_ROLE || "SYSADMIN",
    warehouse: process.env.SNOWFLAKE_WAREHOUSE || "COMPUTE_WH",
    database: process.env.SNOWFLAKE_DATABASE || "CAREER_LADDER",
    schema: process.env.SNOWFLAKE_SCHEMA || "PUBLIC",
  };
}

let connectionPool: snowflake.Connection | null = null;
let lastFailureTime: number | null = null;
const FAILURE_COOLDOWN_MS = 5 * 60_000; // Wait 5 min after a connection failure before retrying (prevents account lockout cycles)

function getConnection(): Promise<snowflake.Connection> {
  if (connectionPool && connectionPool.isUp()) {
    return Promise.resolve(connectionPool);
  }

  // Prevent rapid reconnection attempts that cause account lockouts
  if (lastFailureTime && Date.now() - lastFailureTime < FAILURE_COOLDOWN_MS) {
    return Promise.reject(
      new Error("Snowflake connection is in cooldown after a recent failure. Try again shortly.")
    );
  }

  const config = getConfig();
  const connection = snowflake.createConnection({
    account: config.account,
    username: config.username,
    password: config.password,
    role: config.role,
    warehouse: config.warehouse,
    database: config.database,
    schema: config.schema,
    application: "CareerLadderAgent",
  });

  return new Promise((resolve, reject) => {
    connection.connect((err, conn) => {
      if (err) {
        console.error("Snowflake connection failed:", err.message);
        lastFailureTime = Date.now();
        reject(err);
      } else {
        lastFailureTime = null;
        connectionPool = conn;
        resolve(conn);
      }
    });
  });
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  statement: unknown;
}

/**
 * Execute a parameterized SQL query against Snowflake.
 * Always use binds for user-supplied values to prevent SQL injection.
 */
export async function executeQuery(
  sql: string,
  binds: (string | number | boolean | null)[] = []
): Promise<QueryResult> {
  const conn = await getConnection();

  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText: sql,
      binds: binds as snowflake.Binds,
      complete: (err, stmt, rows) => {
        if (err) {
          console.error("Query execution failed:", err.message);
          reject(err);
        } else {
          resolve({
            rows: (rows || []) as Record<string, unknown>[],
            statement: stmt,
          });
        }
      },
    });
  });
}

/**
 * Execute multiple SQL statements sequentially (for schema bootstrap).
 */
export async function executeMulti(statements: string[]): Promise<void> {
  for (const sql of statements) {
    const trimmed = sql.trim();
    if (trimmed.length > 0) {
      await executeQuery(trimmed);
    }
  }
}

/**
 * Destroy the connection pool (for graceful shutdown).
 */
export async function destroyConnection(): Promise<void> {
  if (connectionPool) {
    return new Promise((resolve) => {
      connectionPool!.destroy((err) => {
        if (err) {
          console.error("Error destroying connection:", err.message);
        }
        connectionPool = null;
        resolve();
      });
    });
  }
}
