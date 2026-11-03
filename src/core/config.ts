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
  TWITCH_CLIENT_ID: z.string(),
  TWITCH_CLIENT_SECRET: z.string(),
  TWITCH_CLIENT_BASE_URL: z.string().default('https://api.twitch.tv/helix'),
  TWITCH_COMPETITION_UPDATE_INTERVAL: z.coerce
    .number()
    .int()
    .positive()
    .default(6 * 60 * 60 * 1000),

  TWITCH_COMPETITION_LOCK_KEY: z.string().default('twitch-competition:scheduler:lock'),

  TWITCH_COMPETITION_LOCK_TTL: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.dir(z.treeifyError(parsed.error), { depth: null });
  process.exit(1);
}

export const config = parsed.data;
