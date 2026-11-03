import { and, eq, gt, lte } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import {
  twitchCompetitionsTable,
  twitchCompetitionPostsTable,
  type NewTwitchCompetition,
  type NewTwitchCompetitionPost,
  type TwitchCompetition,
  type TwitchCompetitionPost,
} from '../schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Database = PostgresJsDatabase<any>;

export interface TwitchCompetitionWithPosts {
  competition: TwitchCompetition;
  posts: TwitchCompetitionPost[];
}

export class TwitchCompetitionRepository {
  constructor(private readonly db: Database) {}

  async createCompetition(data: NewTwitchCompetition): Promise<TwitchCompetition> {
    const [competition] = await this.db.insert(twitchCompetitionsTable).values(data).returning();

    return competition;
  }

  async createPost(data: NewTwitchCompetitionPost): Promise<TwitchCompetitionPost> {
    const [post] = await this.db.insert(twitchCompetitionPostsTable).values(data).returning();

    return post;
  }

  async findActive(now: Date = new Date()): Promise<TwitchCompetition[]> {
    return this.db
      .select()
      .from(twitchCompetitionsTable)
      .where(gt(twitchCompetitionsTable.ends_at, now))
      .orderBy(twitchCompetitionsTable.ends_at);
  }

  async findActiveWithPosts(now = new Date()): Promise<TwitchCompetitionWithPosts[]> {
    const rows = await this.db
      .select({
        competition: twitchCompetitionsTable,
        post: twitchCompetitionPostsTable,
      })
      .from(twitchCompetitionsTable)
      .innerJoin(
        twitchCompetitionPostsTable,
        eq(twitchCompetitionPostsTable.competition_id, twitchCompetitionsTable.id)
      )
      .where(gt(twitchCompetitionsTable.ends_at, now))
      .orderBy(twitchCompetitionsTable.ends_at);

    const competitions = new Map<string, TwitchCompetitionWithPosts>();

    for (const row of rows) {
      const existing = competitions.get(row.competition.id);

      if (existing) {
        existing.posts.push(row.post);
      } else {
        competitions.set(row.competition.id, {
          competition: row.competition,
          posts: [row.post],
        });
      }
    }

    return [...competitions.values()];
  }

  async findPost(
    competitionId: string,
    guildId: string
  ): Promise<TwitchCompetitionPost | undefined> {
    const [post] = await this.db
      .select()
      .from(twitchCompetitionPostsTable)
      .where(
        and(
          eq(twitchCompetitionPostsTable.competition_id, competitionId),
          eq(twitchCompetitionPostsTable.guild_id, guildId)
        )
      )
      .limit(1);

    return post;
  }

  async updatePostLastUpdated(postId: string, date: Date = new Date()): Promise<void> {
    await this.db
      .update(twitchCompetitionPostsTable)
      .set({ last_updated_at: date })
      .where(eq(twitchCompetitionPostsTable.id, postId));
  }

  async deleteCompetition(competitionId: string): Promise<void> {
    await this.db
      .delete(twitchCompetitionsTable)
      .where(eq(twitchCompetitionsTable.id, competitionId));
  }

  async deletePost(postId: string): Promise<void> {
    await this.db
      .delete(twitchCompetitionPostsTable)
      .where(eq(twitchCompetitionPostsTable.id, postId));
  }
}
