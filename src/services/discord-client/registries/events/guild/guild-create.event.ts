import { EmbedBuilder, Events, Guild } from 'discord.js';
import { Event } from '../../../classes/event';
import { CustomClient } from '../../../classes/custom-client';
import { logger } from '../../../../../libs/logger';

export default class GuildCreate extends Event {
  constructor(client: CustomClient) {
    super(client, {
      name: Events.GuildCreate,
      description: 'Guild joined monitoring snapshot',
      once: false,
    });
  }

  async execute(guild: Guild) {
    await sendOwnerWelcomeMessage(guild, this.client);
  }
}

export const sendOwnerWelcomeMessage = async (guild: Guild, client: CustomClient) => {
  try {
    const owner = await guild.fetchOwner();
    const iconUrl = guild.iconURL({ size: 128 });

    const welcomeEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`Thanks for adding ${client.user?.username ?? 'the bot'} to your server! 🎉`)
      .setDescription(
        [
          `Hello **${owner.displayName}**!`,
          '',
          `Thank you for adding me to **${guild.name}**. I’m excited to be part of your community!`,
          '',
          'Here are a few things you can do to get started:',
          '• Use `/help` to explore my commands.',
          '• Use `/patch subscribe` to receive alerts whenever a new patch is released.',
          '• Make sure I have the permissions required for the features you want to use.',
          '',
          'Need assistance? Use `/support` to find the support server or contact the development team.',
        ].join('\n')
      )
      .addFields({
        name: 'Commands your members might enjoy',
        value: [
          '**`/history`** — View your match history.',
          '**`/stats`** — View detailed stats for a player.',
          '**`/patch`** — Read the latest patch notes.',
        ].join('\n\n'),
      })
      .setThumbnail(iconUrl ?? client.user?.displayAvatarURL() ?? null)
      .setFooter({
        text: 'Thanks for choosing us - see you in the Cursed Apple!',
        iconURL: client.user?.displayAvatarURL(),
      })
      .setTimestamp();

    await owner.send({ embeds: [welcomeEmbed] });
  } catch (error) {
    logger.discord.warn(
      `Could not send a welcome message to the owner of ${guild.name} (${guild.id}).`,
      {
        error,
      }
    );
  }
};
