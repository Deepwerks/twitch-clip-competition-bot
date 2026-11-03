import { Events, Guild } from 'discord.js';
import { Event } from '../../../classes/event';
import { CustomClient } from '../../../classes/custom-client';
import { logger } from '../../../../../libs/logger';

export default class GuildDelete extends Event {
  constructor(client: CustomClient) {
    super(client, {
      name: Events.GuildDelete,
      description: 'Guild left monitoring snapshot',
      once: false,
    });
  }

  async execute(guild: Guild) {
    const partialState = getPartialGuildDeleteState(guild);
    if (partialState.isPartial) {
      logger.discord.warn('Skipping partial guild delete event.', {
        guildId: guild.id,
        available: partialState.available,
        hasName: partialState.hasName,
        hasMemberCount: partialState.hasMemberCount,
        hasJoinedAt: partialState.hasJoinedAt,
      });
      return;
    }
  }
}

function getPartialGuildDeleteState(guild: Guild): {
  available: boolean;
  hasName: boolean;
  hasMemberCount: boolean;
  hasJoinedAt: boolean;
  isPartial: boolean;
} {
  const hasName = typeof guild.name === 'string' && guild.name.trim().length > 0;
  const hasMemberCount =
    typeof guild.memberCount === 'number' && Number.isFinite(guild.memberCount);
  const hasJoinedAt = guild.joinedAt instanceof Date && !Number.isNaN(guild.joinedAt.getTime());
  const available = guild.available;

  return {
    available,
    hasName,
    hasMemberCount,
    hasJoinedAt,
    isPartial: !available && (!hasName || !hasMemberCount || !hasJoinedAt),
  };
}
