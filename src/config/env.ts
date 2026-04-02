import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  GEMINI_API_KEY: z.string().min(1).optional(),
  THREADS_USER_ID: z.string().min(1).optional(),
  THREADS_ACCESS_TOKEN: z.string().min(1).optional(),
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  TELEGRAM_ADMIN_ID: z.string().min(1).optional(),
  TELEGRAM_ADMIN_ID_2: z.string().min(1).optional(),
  BOT_ACCESS_PASSWORD: z.string().min(1).optional(),
  WEBHOOK_SECRET: z.string().min(1).optional(),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .optional(),
  TZ: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates and returns environment variables.
 * Throws with a clear message if required vars are missing.
 */
export function loadEnv(strict = true): Env {
  const parsed = envSchema.safeParse(Bun.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  const env = parsed.data;
  if (strict) {
    if (!env.GEMINI_API_KEY)
      throw new Error('GEMINI_API_KEY is required — get it at https://aistudio.google.com/app/apikey');
    if (!env.THREADS_USER_ID)
      throw new Error('THREADS_USER_ID is required — find it in your Threads / Meta developer dashboard');
    if (!env.THREADS_ACCESS_TOKEN)
      throw new Error('THREADS_ACCESS_TOKEN is required — generate it in your Threads / Meta developer dashboard');
  }
  return env;
}
