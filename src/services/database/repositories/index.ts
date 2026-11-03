import { db } from '../database-client';
import { TwitchCompetitionRepository } from './twitch-competition.repository';

export const twitchCompetitionRepository = new TwitchCompetitionRepository(db);
