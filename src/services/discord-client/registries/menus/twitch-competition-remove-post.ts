import { MessageFlags, PermissionsBitField, StringSelectMenuInteraction } from 'discord.js';
import { logger } from '../../../../libs/logger';
import { twitchCompetitionRepository } from '../../../database/repositories';
import { CustomClient } from '../../classes/custom-client';
import { SelectMenu } from '../../classes/select-menu';
import { TWITCH_COMPETITION_REMOVE_POST_MENU_ID } from '../../constants';

export default class TwitchCompetitionRemovePostSelectMenu extends SelectMenu {
  constructor(client: CustomClient) {
    super(client, {
      customId: TWITCH_COMPETITION_REMOVE_POST_MENU_ID,
      description: 'Select a Twitch competition post to remove',
      cooldown: 3,
    });
  }

  async execute(interaction: StringSelectMenuInteraction): Promise<void> {
    if (!interaction.guild || !interaction.guildId) {
      await interaction.reply({
        content: 'This menu can only be used in a server.',
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
      await interaction.reply({
        content: 'You must be a server administrator to remove competition posts.',
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    await interaction.deferUpdate();

    try {
      if (interaction.values.length !== 1) {
        await interaction.editReply({
          content: 'Invalid competition selection. Please run the command again.',
          components: [],
        });
        return;
      }

      const competitionId = interaction.values[0];

      const post = await twitchCompetitionRepository.findPost(competitionId, interaction.guildId);

      if (!post) {
        await interaction.editReply({
          content: 'This competition does not have a post in this server.',
          components: [],
        });
        return;
      }

      const channel = await interaction.guild.channels.fetch(post.channel_id);

      if (!channel || !channel.isTextBased() || !('messages' in channel)) {
        await interaction.editReply({
          content: 'The channel containing this competition post could not be found.',
          components: [],
        });
        return;
      }

      const message = await channel.messages.fetch(post.message_id).catch(() => null);

      if (message) {
        await message.delete();
      }

      await twitchCompetitionRepository.deletePost(post.id);

      await interaction.editReply({
        content: message
          ? 'The competition post has been successfully removed from this server.'
          : 'The original Discord message was already deleted. Its database record has been cleaned up.',
        components: [],
      });
    } catch (error) {
      logger.discord.error('Failed to remove Twitch competition post', {
        guildId: interaction.guildId,
        userId: interaction.user.id,
        error,
      });

      await interaction.editReply({
        content: 'Something went wrong while removing the competition post.',
        components: [],
      });
    }
  }
}
