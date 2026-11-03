import { redisProvider } from '../../libs/redis/redis';
import { twitchCompetitionRepository } from '../database/repositories';
import { discordClient } from '../discord-client/discord-client';
import { TwitchCompetitionScheduler } from './twitch-competition.scheduler';

export const twitchCompetitionScheduler = new TwitchCompetitionScheduler(
  discordClient,
  twitchCompetitionRepository,
  redisProvider.getClient()
);
