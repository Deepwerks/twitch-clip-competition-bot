import {
  pgSchema,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

export const twitchCompetitionsSchema = pgSchema('twitch_competitions');

export const twitchCompetitionsTable = twitchCompetitionsSchema.table(
  'competitions',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    vod_id: varchar('vod_id', { length: 32 }).notNull(),
    vod_url: text('vod_url').notNull(),

    description: varchar('description', { length: 255 }).notNull(),
    banner_url: text('banner_url'),

    duration_days: integer('duration_days').notNull(),

    started_at: timestamp('started_at', { withTimezone: true }).notNull(),
    ends_at: timestamp('ends_at', { withTimezone: true }).notNull(),

    created_by: varchar('created_by', { length: 32 }).notNull(),

    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('competitions_ends_at_idx').on(table.ends_at),
    index('competitions_vod_id_idx').on(table.vod_id),
  ]
);

export const twitchCompetitionPostsTable = twitchCompetitionsSchema.table(
  'competition_posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    competition_id: uuid('competition_id')
      .notNull()
      .references(() => twitchCompetitionsTable.id, { onDelete: 'cascade' }),

    guild_id: varchar('guild_id', { length: 32 }).notNull(),
    channel_id: varchar('channel_id', { length: 32 }).notNull(),
    message_id: varchar('message_id', { length: 32 }).notNull(),

    notified_role_id: varchar('notified_role_id', { length: 32 }),

    last_updated_at: timestamp('last_updated_at', { withTimezone: true }),

    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('competition_posts_competition_guild_unique').on(
      table.competition_id,
      table.guild_id
    ),
    index('competition_posts_competition_id_idx').on(table.competition_id),
  ]
);

export type TwitchCompetition = typeof twitchCompetitionsTable.$inferSelect;
export type NewTwitchCompetition = typeof twitchCompetitionsTable.$inferInsert;

export type TwitchCompetitionPost = typeof twitchCompetitionPostsTable.$inferSelect;
export type NewTwitchCompetitionPost = typeof twitchCompetitionPostsTable.$inferInsert;
