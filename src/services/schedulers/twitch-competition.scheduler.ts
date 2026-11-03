import { randomUUID } from 'crypto';
import { TextChannel } from 'discord.js';
import type IORedis from 'ioredis';
import { logger } from '../../libs/logger';
import { TwitchCompetitionRepository } from '../database/repositories/twitch-competition.repository';
import { CustomClient } from '../discord-client/classes/custom-client';
import { buildTwitchCompetitionMessage } from '../discord-client/components/command/twitch-competition-message';
import { twitchVodAnalizer } from '../twitch-clips';
import { config } from '../../core/config';

const UPDATE_INTERVAL = config.TWITCH_COMPETITION_UPDATE_INTERVAL;
const LOCK_KEY = config.TWITCH_COMPETITION_LOCK_KEY;
const LOCK_TTL = config.TWITCH_COMPETITION_LOCK_TTL;

export class TwitchCompetitionScheduler {
  private interval?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly client: CustomClient,
    private readonly repository: TwitchCompetitionRepository,
    private readonly redis: IORedis
  ) {}

  start() {
    if (this.interval) return;

    logger.discord.info('Starting Twitch competition scheduler.');

    // Run once on startup, then every six hours.
    void this.updateCompetitions();

    this.interval = setInterval(() => {
      void this.updateCompetitions();
    }, UPDATE_INTERVAL);

    this.interval.unref();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }

    logger.discord.info('Stopped Twitch competition scheduler.');
  }

  private async updateCompetitions() {
    if (this.running) return;

    this.running = true;

    const lockToken = randomUUID();

    try {
      const lock = await this.redis.set(LOCK_KEY, lockToken, 'EX', LOCK_TTL, 'NX');

      if (lock !== 'OK') {
        logger.discord.info('Another bot instance is already updating Twitch competitions.');
        return;
      }

      const competitions = await this.repository.findActiveWithPosts();

      if (!competitions.length) {
        logger.discord.info('No active Twitch competitions to update.');
        return;
      }

      logger.discord.info(`Updating ${competitions.length} active Twitch competitions.`);

      for (const { competition, posts } of competitions) {
        // The competition may have expired since the query ran.
        if (competition.ends_at <= new Date()) continue;

        try {
          // Fetch Twitch data once and reuse it for every server post.
          const vod = await twitchVodAnalizer.fetchVodClipData(competition.vod_url);

          if (!vod) {
            logger.discord.warn(`Failed to fetch VOD data for competition ${competition.id}.`);
            continue;
          }

          for (const post of posts) {
            try {
              const channel = await this.client.channels.fetch(post.channel_id);

              if (!channel || (channel.type !== 0 && channel.type !== 5)) {
                logger.discord.warn(`Invalid channel for Twitch competition post ${post.id}.`);
                continue;
              }

              const targetChannel = channel as TextChannel;

              const message = await targetChannel.messages.fetch(post.message_id);

              const container = buildTwitchCompetitionMessage({
                vod,
                description: competition.description,
                vodUrl: competition.vod_url,
                endsAt: competition.ends_at,
                bannerUrl: competition.banner_url ?? undefined,
                notifiedRoleId: post.notified_role_id ?? undefined,
              });

              await message.edit({
                components: [container],
                allowedMentions: {
                  parse: [],
                  roles: post.notified_role_id ? [post.notified_role_id] : [],
                },
              });

              await this.repository.updatePostLastUpdated(post.id);

              logger.discord.info(`Updated Twitch competition post ${post.id}.`);
            } catch (error) {
              logger.discord.error(`Failed to update Twitch competition post ${post.id}:`, {
                error,
              });
            }
          }
        } catch (error) {
          logger.discord.error(`Failed to update Twitch competition ${competition.id}:`, { error });
        }
      }
    } catch (error) {
      logger.discord.error('Twitch competition scheduler failed:', { error });
    } finally {
      // Only release the lock if it still belongs to this execution.
      try {
        await this.redis.eval(
          `
            if redis.call("get", KEYS[1]) == ARGV[1] then
              return redis.call("del", KEYS[1])
            end
            return 0
          `,
          1,
          LOCK_KEY,
          lockToken
        );
      } catch (error) {
        logger.redis.error('Failed to release Twitch competition lock:', {
          error,
        });
      }

      this.running = false;
    }
  }
}
