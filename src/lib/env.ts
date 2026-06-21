import { z } from "zod";

const envSchema = z.object({
  SNOWFLAKE_ACCOUNT: z.string().min(1),
  SNOWFLAKE_USER: z.string().min(1),
  SNOWFLAKE_PASSWORD: z.string().min(1),
  SNOWFLAKE_ROLE: z.string().min(1),
  SNOWFLAKE_WAREHOUSE: z.string().min(1),
  SNOWFLAKE_DATABASE: z.string().default("CAREER_LADDER"),
  SNOWFLAKE_SCHEMA: z.string().default("PUBLIC"),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | undefined;

export function getEnv(): Env {
  if (_env) return _env;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`❌ Missing required environment variables: ${missing}`);
  }

  _env = parsed.data;
  return _env;
}
