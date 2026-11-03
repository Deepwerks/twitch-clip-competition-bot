import { z } from 'zod';
import { getBotVersion } from './config.helpers';

const botVersion = getBotVersion() || '1.0.0';

const envSchema = z.object({
  NODE_ENV: z.enum(['production', 'development']),
  LOG_LEVEL: z.string().default('INFO'),
  BOT_VERSION: z.string().default(botVersion),
  DISCORD_BOT_TOKEN: z.string(),
  DISCORD_CLIENT_ID: z.string(),
  DEVELOPER_GUILD_ID: z.string().optional(),
  DEVELOPER_ID: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  TOPGG_TOKEN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.dir(z.treeifyError(parsed.error), { depth: null });
  process.exit(1);
}

export const config = parsed.data;
