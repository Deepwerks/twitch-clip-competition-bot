import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ChannelType,
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionsBitField,
  Role,
  StringSelectMenuBuilder,
} from 'discord.js';

import { Command } from '../../../classes/command';
import { CustomClient } from '../../../classes/custom-client';
import CommandCategory from '../../../types/command-category.enum';

import { twitchCompetitionRepository } from '../../../../database/repositories';
import { logger } from '../../../../../libs/logger';

export const TWITCH_COMPETITION_REPOST_MENU_ID = 'twitch-competition-repost';

export default class TwitchCompetitionRepost extends Command {
  constructor(client: CustomClient) {
    super(client, {
      parentName: 'twitch-competition',
      name: 'repost',
      description: 'Repost an active Twitch competition',
      category: CommandCategory.ClipCompetition,
      default_member_permissions: PermissionsBitField.Flags.Administrator,
      dm_permission: false,
      cooldown: 3,
      options: [
        {
          name: 'channel',
          description: 'Channel to send the announcement',
          required: true,
          type: ApplicationCommandOptionType.Channel,
        },
        {
          name: 'notified-role',
          description: 'Role to notify when the competition is reposted',
          required: false,
          type: ApplicationCommandOptionType.Role,
        },
      ],
      dev: false,
    });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const channel = interaction.options.getChannel('channel', true);
      const notifiedRole = interaction.options.getRole('notified-role') as Role | null;

      if (
        channel.type !== ChannelType.GuildText &&
        channel.type !== ChannelType.GuildAnnouncement
      ) {
        await interaction.editReply({
          content: 'Please select a text or announcement channel.',
        });
        return;
      }

      if (!interaction.guildId) {
        await interaction.editReply({
          content: 'This command can only be used in a server.',
        });
        return;
      }

      const competitions = await twitchCompetitionRepository.findActive();

      if (!competitions.length) {
        await interaction.editReply({
          content: 'There are no active Twitch competitions to repost.',
        });
        return;
      }

      // Discord string select menus support a maximum of 25 options.
      const availableCompetitions = competitions.slice(0, 25);

      const customId = [
        TWITCH_COMPETITION_REPOST_MENU_ID,
        channel.id,
        notifiedRole?.id ?? 'none',
      ].join(':');

      const menu = new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder('Select a competition to repost')
        .addOptions(
          availableCompetitions.map((competition) => ({
            label: `VOD: ${competition.vod_id}`,
            description: `Ends ${competition.ends_at.toLocaleDateString()}`,
            value: competition.id,
          }))
        );

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

      await interaction.editReply({
        content: 'Select an active competition to repost:',
        components: [row],
      });
    } catch (error) {
      logger.discord.error('Failed to create Twitch competition repost menu', { error });

      await interaction.editReply({
        content: 'Something went wrong while preparing the competition repost.',
        components: [],
      });
    }
  }
}
