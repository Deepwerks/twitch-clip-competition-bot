import {
  ActionRowBuilder,
  MessageFlags,
  PermissionsBitField,
  StringSelectMenuBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';

import { Command } from '../../../classes/command';
import { CustomClient } from '../../../classes/custom-client';
import CommandCategory from '../../../types/command-category.enum';

import { twitchCompetitionRepository } from '../../../../database/repositories';
import { logger } from '../../../../../libs/logger';
import { TWITCH_COMPETITION_REMOVE_POST_MENU_ID } from '../../../constants';

export default class TwitchCompetitionRemovePost extends Command {
  constructor(client: CustomClient) {
    super(client, {
      parentName: 'twitch-competition',
      name: 'remove',
      description: 'Remove a Twitch competition announcement from this server',
      category: CommandCategory.ClipCompetition,
      default_member_permissions: PermissionsBitField.Flags.Administrator,
      dm_permission: false,
      cooldown: 3,
      options: [],
      dev: false,
    });
  }

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      if (!interaction.guildId) {
        await interaction.editReply({
          content: 'This command can only be used in a server.',
        });
        return;
      }

      const competitions = await twitchCompetitionRepository.findActive();
      const competitionsWithPosts = [];

      for (const competition of competitions) {
        const post = await twitchCompetitionRepository.findPost(
          competition.id,
          interaction.guildId
        );

        if (post) {
          competitionsWithPosts.push({ competition, post });
        }
      }

      if (!competitionsWithPosts.length) {
        await interaction.editReply({
          content: 'There are no active competition posts in this server.',
        });
        return;
      }

      const menu = new StringSelectMenuBuilder()
        .setCustomId(TWITCH_COMPETITION_REMOVE_POST_MENU_ID)
        .setPlaceholder('Select a competition post to remove')
        .addOptions(
          competitionsWithPosts.slice(0, 25).map(({ competition }) => ({
            label: `VOD: ${competition.vod_id}`,
            description: `Ends ${competition.ends_at.toLocaleDateString()}`,
            value: competition.id,
          }))
        );

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

      await interaction.editReply({
        content: 'Select the competition post you want to remove from this server:',
        components: [row],
      });
    } catch (error) {
      logger.discord.error('Failed to create Twitch competition remove-post menu', {
        error,
      });

      await interaction.editReply({
        content: 'Something went wrong while preparing the removal menu.',
        components: [],
      });
    }
  }
}
